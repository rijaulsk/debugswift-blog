import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

import type { SanityClient } from "@sanity/client";

import { resetKeys } from "@/content/helpers";
import type { BodyBlock } from "@/lib/types";
import { fail, readEnv, writeClient, type ScriptEnv } from "@/scripts/lib/env";
import { DraftParseError, isTruthy, parseDraft } from "@/scripts/lib/draftFormat";
import { convertDraft, type FigureRef } from "@/scripts/lib/draftToPortableText";
import { fromSanityDoc, summarise, validatePost } from "@/sanity/lib/validatePost";

/* npm run push <slug> -- [--dry-run] [--update] [--force]
 *
 * Takes drafts/<slug>.md and writes it into Sanity as an UNPUBLISHED DRAFT.
 * A human then opens the Studio, adds the cover, runs the originality check and
 * presses Publish. Nothing this script writes can reach the site on its own,
 * and that is the whole design — it is the same drafts. prefix the guest
 * pipeline already uses in sanity/actions/createPostFromDraft.ts.
 *
 * THE `--` IS NOT OPTIONAL. npm consumes flags it recognises — `--force` is one
 * of its own — before the script ever sees process.argv. `npm run push x --force`
 * silently does not force.
 *
 * There is no --all, and there will not be one: pushing a batch of unreviewed
 * agent output is the opposite of a review gate. There is no --publish either.
 *
 * WHAT IT WILL NOT WRITE, ever:
 *   originalityCheckedWith / originalityCheckedAt — a human step. The parser
 *     refuses a draft file that even mentions them.
 *   cover — unless the file names a Cloudinary public_id that already exists.
 *   updatedAt — WRITING-GUIDE.md §6: only a person can judge "substantial",
 *     and bumping it for a typo is the freshness-gaming that discounts a site.
 *   audio, featured, redirectsFrom — owned elsewhere.
 */

const OWNED_FIELDS = [
  "title",
  "slug",
  "excerpt",
  "shortAnswer",
  "keyTakeaways",
  "body",
  "topic",
  "author",
  "faqs",
  "sources",
  "seoTitle",
  "seoDescription",
  "noindex",
  "publishedAt",
] as const;

type Owned = Record<string, unknown>;

/* ------------------------------------------------------------------ helpers */

const out = (line = "") => console.log(line);

/** Strips _key and sorts keys, so the hash is stable across two runs that
 *  produced the same content. resetKeys() already makes keys deterministic;
 *  this makes the comparison independent of that too. */
function canonical(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(canonical);
  if (node && typeof node === "object") {
    const source = node as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      if (key === "_key") continue;
      result[key] = canonical(source[key]);
    }
    return result;
  }
  return node;
}

const hashOf = (fields: Owned): string =>
  createHash("sha1").update(JSON.stringify(canonical(fields))).digest("hex");

const pick = (doc: Record<string, unknown> | null | undefined): Owned => {
  const result: Owned = {};
  if (!doc) return result;
  for (const field of OWNED_FIELDS) {
    if (doc[field] !== undefined) result[field] = doc[field];
  }
  return result;
};

/** A hash per owned field, so a mismatch can name the field that moved rather
 *  than shrugging at the whole document. Stored as a JSON string because the
 *  key set is dynamic and a Sanity object schema wants fixed fields. */
const fieldHashes = (fields: Owned): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const field of OWNED_FIELDS) {
    if (fields[field] !== undefined) result[field] = hashOf({ [field]: fields[field] });
  }
  return result;
};

/** Which owned fields differ between what is stored now and what push wrote. */
function changedFields(stored: Owned, stampedJson: string | undefined): string[] {
  let stamped: Record<string, string>;
  try {
    stamped = stampedJson ? (JSON.parse(stampedJson) as Record<string, string>) : {};
  } catch {
    return ["(unreadable push record)"];
  }

  const now = fieldHashes(stored);
  const names = new Set([...Object.keys(now), ...Object.keys(stamped)]);
  return [...names].filter((field) => now[field] !== stamped[field]).sort();
}

/* ------------------------------------------------------------------- args */

type Args = { target: string; dryRun: boolean; update: boolean; force: boolean };

function parseArgs(argv: string[]): Args {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const positional = argv.filter((a) => !a.startsWith("--"));

  for (const flag of flags) {
    if (!["--dry-run", "--update", "--force"].includes(flag)) {
      fail(`unknown flag ${flag}. Valid: --dry-run, --update, --force (after a "--").`);
    }
  }
  if (!positional.length) {
    fail('usage: npm run push <slug> -- [--dry-run] [--update] [--force]');
  }

  return {
    target: positional[0]!,
    dryRun: flags.has("--dry-run"),
    update: flags.has("--update"),
    force: flags.has("--force"),
  };
}

function resolveDraftPath(target: string): string {
  const candidates = target.endsWith(".md")
    ? [resolve(process.cwd(), target)]
    : [
        resolve(process.cwd(), "drafts", `${target}.md`),
        resolve(process.cwd(), target),
      ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return fail(`no draft file found. Looked for drafts/${target}.md`);
}

/* -------------------------------------------------------------- cloudinary */

type CloudinaryResource = {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  resource_type: string;
};

/**
 * Verify a public_id and take Cloudinary's own answer for the asset object.
 *
 * Nothing here is guessed. resolveCover()'s 1200x800 fallback exists for a
 * Cloudinary hiccup, not as a licence to invent dimensions, and
 * lib/portableText.ts reads asset.secure_url directly — a hand-made asset
 * object would produce a broken image in /md/<slug> and the feeds.
 */
async function lookupAsset(env: ScriptEnv, publicId: string): Promise<CloudinaryResource> {
  if (!env.cloudinaryCloud || !env.cloudinaryKey || !env.cloudinarySecret) {
    fail(
      `this draft names a Cloudinary image ("${publicId}") but CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET / NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME are not all set in .env.local. A draft with no cover pushes fine without them.`,
    );
  }

  const auth = Buffer.from(`${env.cloudinaryKey}:${env.cloudinarySecret}`).toString("base64");
  const url = `https://api.cloudinary.com/v1_1/${env.cloudinaryCloud}/resources/image/upload/${encodeURIComponent(publicId)}`;
  const response = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });

  if (response.status === 404) {
    fail(
      `Cloudinary has no image with public_id "${publicId}". Never invent one — a wrong id is a broken image on a live page. Omit the field and note what you would suggest in a \`\`\`ds-note fence instead.`,
    );
  }
  if (!response.ok) {
    fail(`Cloudinary returned ${response.status} for "${publicId}"`);
  }

  const data = (await response.json()) as CloudinaryResource;
  return data;
}

const assetObject = (resource: CloudinaryResource) => ({
  _type: "cloudinary.asset",
  public_id: resource.public_id,
  secure_url: resource.secure_url,
  format: resource.format,
  width: resource.width,
  height: resource.height,
  resource_type: resource.resource_type,
});

/* ---------------------------------------------------------------- references */

async function resolveReference(
  client: SanityClient,
  type: "topic" | "author",
  slug: string,
): Promise<string> {
  const published = await client.fetch<{ _id: string } | null>(
    `*[_type == $type && slug.current == $slug && !(_id in path("drafts.**"))][0]{ _id }`,
    { type, slug },
  );
  if (published?._id) return published._id;

  /* perspective "raw" or the draft is invisible here. A token client filters
   * drafts out of a GROQ query by default, which would turn "you have it open
   * in the Studio, unpublished" into the much less useful "no such topic". */
  const anyDoc = await client.withConfig({ perspective: "raw" }).fetch<{ _id: string } | null>(
    `*[_type == $type && slug.current == $slug][0]{ _id }`,
    { type, slug },
  );
  if (anyDoc?._id) {
    fail(
      `${type} "${slug}" exists only as an unpublished draft in the Studio. Publish it first.`,
    );
  }

  const available = await client.fetch<string[]>(
    `*[_type == $type && defined(slug.current)].slug.current`,
    { type },
  );
  /* Never create one. An agent creating an author is "never invent a person"
   * broken directly; an agent creating a topic is silent taxonomy sprawl, and
   * topics are pillar pages capped at five deliberately. */
  return fail(
    `no ${type} with slug "${slug}". This script never creates one — pick from: ${available.sort().join(", ")}`,
  );
}

/* --------------------------------------------------------------------- main */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const path = resolveDraftPath(args.target);
  const file = `drafts/${basename(path)}`;
  const env = readEnv();
  const client = writeClient(env);

  out();
  out(`  ${file}`);

  /* ---- parse ---- */
  resetKeys();
  const draft = parseDraft(readFileSync(path, "utf8"), file);
  const converted = convertDraft(draft, file);

  const front = draft.frontmatter;
  const slug = (front.slug ?? "").trim();
  const stem = basename(path).replace(/\.md$/, "");

  if (!slug) fail(`${file} has no "slug:" in its frontmatter`);
  if (slug !== stem) {
    fail(
      `frontmatter slug "${slug}" does not match the filename "${stem}.md". The document id is derived from the slug, so a mismatch would write to a document you did not mean.`,
    );
  }

  const draftId = `drafts.post-${slug}`;
  const publishedId = `post-${slug}`;
  out(`    -> ${draftId}`);
  out();

  /* ---- references ---- */
  const topicSlug = (front.topic ?? "").trim();
  const authorSlug = (front.author ?? "").trim();
  if (!topicSlug) fail(`${file} has no "topic:" — every post belongs to exactly one`);
  if (!authorSlug) fail(`${file} has no "author:"`);

  const topicId = await resolveReference(client, "topic", topicSlug);
  const authorId = await resolveReference(client, "author", authorSlug);

  /* ---- cloudinary ---- */
  let cover: ReturnType<typeof assetObject> | null = null;
  if (front.cover?.trim()) {
    cover = assetObject(await lookupAsset(env, front.cover.trim()));
  }

  const body = [...converted.body] as BodyBlock[];
  for (const ref of converted.figureRefs as FigureRef[]) {
    const resource = await lookupAsset(env, ref.publicId);
    const block = body[ref.index] as Record<string, unknown>;
    block.asset = assetObject(resource);
  }

  /* ---- the document ---- */
  const present: Owned = {
    title: front.title ?? "",
    slug: { _type: "slug", current: slug },
    excerpt: front.excerpt ?? "",
    shortAnswer: draft.fields.shortAnswer ?? "",
    body,
    topic: { _type: "reference", _ref: topicId },
    author: { _type: "reference", _ref: authorId },
    noindex: isTruthy(front.noindex ?? ""),
    publishedAt: front.publishedAt?.trim() || new Date().toISOString(),
  };

  if (draft.fields.keyTakeaways?.length) present.keyTakeaways = draft.fields.keyTakeaways;
  if (draft.fields.faqs?.length) {
    present.faqs = draft.fields.faqs.map((faq, i) => ({ ...faq, _key: `faq-${i}` }));
  }
  if (draft.fields.sources?.length) {
    present.sources = draft.fields.sources.map((src, i) => ({ ...src, _key: `src-${i}` }));
  }
  if (front.seoTitle?.trim()) present.seoTitle = front.seoTitle.trim();
  if (front.seoDescription?.trim()) present.seoDescription = front.seoDescription.trim();

  /* Fields this script owns but the file no longer carries must be UNSET, not
   * set to undefined: Sanity serialises undefined away, so `.set()` alone would
   * leave a deleted seoTitle in place for ever. */
  const absentOwned = OWNED_FIELDS.filter((field) => present[field] === undefined);

  /* ---- validate ---- */
  const forChecks = {
    ...present,
    cover: cover ?? undefined,
    coverAlt: front.coverAlt ?? "",
  };
  /* The originality checks are SKIPPED here, not failed.
   *
   * This script never writes those fields — that is the whole point of §6 — so
   * failing on them would mean no push could ever succeed. They stay required
   * in the schema, so the Studio still refuses to publish until a person has
   * run the check and typed what they used. The gate has not moved; it is just
   * enforced where a person can actually satisfy it, and the closing summary
   * below says so out loud. */
  const results = validatePost(fromSanityDoc(forChecks as Record<string, unknown>), {
    skip: ["originality.recorded", "originality.notFuture"],
  });
  const summary = summarise(results);

  const counts = body.reduce<Record<string, number>>((acc, block) => {
    const type = String((block as { _type?: string })._type ?? "?");
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});
  const wordCount = JSON.stringify(body).split(/\s+/).length;

  out(`  Parsed   ${body.length} blocks — ${Object.entries(counts).map(([t, n]) => `${n} ${t}`).join(", ")}`);
  out(`  Topic    ${topicSlug}  ->  ${topicId}`);
  out(`  Author   ${authorSlug}  ->  ${authorId}`);
  out(`  Cover    ${cover ? `${cover.public_id} (${cover.width}x${cover.height}, ${cover.format})` : "none — a human uploads one in the Studio"}`);
  out();

  if (converted.warnings.length) {
    out("  Format notes");
    for (const w of converted.warnings) out(`    ${file}:${w.line}  ${w.message}`);
    out();
  }

  if (draft.notes.length) {
    out("  Note from the draft");
    for (const note of draft.notes) {
      for (const line of note.split("\n")) out(`    ${line}`);
    }
    out();
  }

  out("  Checks");
  for (const check of results) {
    const state = check.skipped
      ? "SKIP"
      : check.result === true
        ? "PASS"
        : check.severity === "error"
          ? "FAIL"
          : "WARN";
    out(`    ${state}  ${check.name}`);
    if (!check.skipped && check.result !== true) out(`          ${check.result}`);
  }
  out();

  if (!summary.ok) {
    out(
      `  ✗ ${summary.errors.length} blocking failure(s), ${summary.warnings.length} warning(s). Nothing was written.`,
    );
    out();
    process.exit(2);
  }

  if (args.dryRun) {
    out(`  · dry run — nothing written. ${summary.warnings.length} warning(s), ${wordCount} words.`);
    out();
    return;
  }

  /* ---- write ---- */
  const existingDraft = await client.getDocument(draftId);
  const existingPublished = await client.getDocument(publishedId);

  if (!existingDraft && existingPublished && !args.update) {
    out(`  ✗ ${slug} is already published.`);
    out();
    out("    Pushing would create a draft that replaces the live post the moment");
    out("    someone presses Publish. If that is what you want, re-run with --update.");
    out("    If it is not, this draft file is stale — after publishing, the Studio is");
    out("    the source of truth, not drafts/.");
    out();
    process.exit(3);
  }

  if (!existingDraft && !existingPublished && args.update) {
    fail(
      `--update was passed but there is no post at "${slug}". If you renamed the slug, set the old one in "Old slugs" in the Studio first — this script never renames, because a rename without a redirect throws away every link the old URL earned.`,
    );
  }

  if (!existingDraft && existingPublished && args.update) {
    /* Branch from the published document so the cover, the audio and the
     * originality record carry forward and a human does not redo that work. */
    await client.createIfNotExists({ ...existingPublished, _id: draftId });
    out("  · branched a draft from the published post");
  }

  const target = existingDraft ?? (await client.getDocument(draftId));

  if (target) {
    const stamped = target.agentPush as { hash?: string; fields?: string } | undefined;
    const stored = pick(target as unknown as Record<string, unknown>);

    if (stamped?.hash && hashOf(stored) !== stamped.hash) {
      const fields = changedFields(stored, stamped.fields);
      if (!args.force) {
        out("  ✗ the Studio copy has been edited by hand since the last push.");
        out();
        out(`    Changed: ${fields.join(", ")}`);
        out("    Overwriting would throw that away. Take the newer version into the");
        out("    file, or re-run with --force if the file is genuinely the good copy.");
        out();
        process.exit(4);
      }
      out(`  ! --force: overwriting hand edits to ${fields.join(", ")}`);
    }
  }

  const stamp = {
    hash: hashOf(present),
    fields: JSON.stringify(fieldHashes(present)),
    at: new Date().toISOString(),
    source: file,
    /* Which tool ran the push. Internal provenance for the owner — NOT
     * reader-facing disclosure, and never projected into GROQ. Antigravity sets
     * DEBUGSWIFT_PUSH_TOOL=antigravity; anything else reads as claude-code. */
    tool: process.env.DEBUGSWIFT_PUSH_TOOL?.trim() || "claude-code",
  };

  const documentFields: Record<string, unknown> = { ...present, agentPush: stamp };
  if (cover) {
    documentFields.cover = cover;
    documentFields.coverAlt = front.coverAlt?.trim() ?? "";
  }

  let revision: string;

  if (!target) {
    const created = await client.create({
      _id: draftId,
      _type: "post",
      ...documentFields,
      featured: false,
      /* The agent's own contribution to the check it must not certify: a list
       * of what a human should search. The prefix is a statement it cannot
       * forge, sitting next to the two empty required fields. */
      ...(draft.fields.originalityNotes
        ? {
            originalityNotes: [
              `Drafted via \`npm run push\` from ${file} on ${new Date().toISOString().slice(0, 10)}.`,
              "No originality check has been run — that is a human step.",
              "",
              draft.fields.originalityNotes,
            ].join("\n"),
          }
        : {}),
    });
    revision = created._rev;
  } else {
    const patch = client
      .patch(draftId)
      .ifRevisionId(target._rev)
      .set(documentFields);
    const committed = await (absentOwned.length ? patch.unset([...absentOwned]) : patch).commit();
    revision = committed._rev;
  }

  out(`  ✓ ${draftId} written (rev ${revision.slice(0, 8)})`);
  if (summary.warnings.length) out(`    ${summary.warnings.length} warning(s) above.`);
  out();
  out(`    /blog/studio/structure/post;${draftId}`);
  out();
  out("    Before this can be published, a human must:");
  if (!cover) out("      · upload a cover image and write its alt text");
  out("      · run the originality check and fill in the Pre-publish checks tab");
  out();
  out("    Nothing is live until someone presses Publish.");
  out();
}

main().catch((error) => {
  if (error instanceof DraftParseError) {
    console.error(`\n  ✗ ${error.toString()}\n`);
    process.exit(2);
  }
  if ((error as { statusCode?: number }).statusCode === 409) {
    console.error(
      "\n  ✗ the document changed while this ran — another push, or the Studio autosaving. Nothing was written; try again.\n",
    );
    process.exit(5);
  }
  console.error(error);
  process.exit(1);
});
