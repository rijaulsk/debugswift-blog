import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/* Push the local content in content/ into Sanity.
 *
 * Run once, after connecting a project:  npm run seed
 *
 * Why this exists: content/ is what makes a fresh clone of this repo runnable
 * with no accounts at all (see lib/env.ts). Once Sanity is connected, that
 * folder stops being read — so without this script the demo post would simply
 * vanish the moment the project ID was set, and someone would have to retype it
 * into the Studio.
 *
 * It is idempotent. Every document gets a deterministic _id derived from its
 * slug and is written with createIfNotExists, so running it twice creates
 * nothing and overwrites nothing. Editing the demo post in the Studio and then
 * re-running this will NOT clobber your edits — Sanity is the source of truth
 * after seeding, and this script respects that.
 *
 * Requires SANITY_API_WRITE_TOKEN (Editor role) in .env.local. That token is
 * local-only and must never be set on the Vercel deployment: nothing in the
 * running site needs to create posts.
 *
 * `tsx` runs this rather than plain node because the content modules import via
 * the "@/*" tsconfig alias, which node's type-stripping does not resolve. The
 * alternative was a second copy of the demo post that could drift from the
 * first, which is a worse problem than a dev dependency.
 */

/* Minimal .env.local reader — the app gets these from Next, but a standalone
 * script does not, and pulling in dotenv for six lines is not worth it. */
function loadDotEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, value] = match;
      if (!process.env[key!]) {
        process.env[key!] = value!.replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* No .env.local is fine if the variables are already exported. */
  }
}

loadDotEnvLocal();

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION?.trim() || "2026-07-01";
const token = process.env.SANITY_API_WRITE_TOKEN?.trim();

function fail(message: string): never {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

if (!projectId) fail("NEXT_PUBLIC_SANITY_PROJECT_ID is not set. Add it to .env.local.");
if (!token) {
  fail(
    "SANITY_API_WRITE_TOKEN is not set. Create an Editor token at sanity.io/manage → API → Tokens, and put it in .env.local (never in Vercel).",
  );
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
});

/* Deterministic ids. Two runs produce the same ids, which is what makes the
 * whole script idempotent — and it means references between documents can be
 * computed rather than looked up. */
const authorId = (slug: string) => `author-${slug}`;
const topicId = (slug: string) => `topic-${slug}`;
const postId = (slug: string) => `post-${slug}`;

async function main() {
  /* Imported lazily so the environment checks above run first — a missing token
   * should produce one clear sentence, not a module-resolution stack trace. */
  const { localAuthors, localPosts, localTopics, localSettings } = await import("../content");

  console.log(`\n  Seeding ${projectId}/${dataset}\n`);

  let created = 0;
  let skipped = 0;

  const report = (kind: string, name: string, wasCreated: boolean) => {
    if (wasCreated) {
      created += 1;
      console.log(`  + ${kind}  ${name}`);
    } else {
      skipped += 1;
      console.log(`  · ${kind}  ${name} (exists — left alone)`);
    }
  };

  for (const author of localAuthors) {
    const _id = authorId(author.slug);
    const before = await client.getDocument(_id);
    await client.createIfNotExists({
      _id,
      _type: "author",
      name: author.name,
      slug: { _type: "slug", current: author.slug },
      role: author.role,
      bio: author.bio,
      isGuest: author.isGuest,
      links: author.links.map((link, i) => ({ ...link, _key: `link-${i}` })),
    });
    report("author", author.name, !before);
  }

  for (const [i, topic] of localTopics.entries()) {
    const _id = topicId(topic.slug);
    const before = await client.getDocument(_id);
    await client.createIfNotExists({
      _id,
      _type: "topic",
      title: topic.title,
      slug: { _type: "slug", current: topic.slug },
      description: topic.description,
      serviceSlug: topic.serviceSlug ?? undefined,
      order: (i + 1) * 10,
    });
    report("topic ", topic.title, !before);
  }

  for (const post of localPosts) {
    const _id = postId(post.slug);
    const before = await client.getDocument(_id);
    await client.createIfNotExists({
      _id,
      _type: "post",
      title: post.title,
      slug: { _type: "slug", current: post.slug },
      excerpt: post.excerpt,
      shortAnswer: post.shortAnswer,
      keyTakeaways: post.keyTakeaways,
      body: post.body,
      faqs: post.faqs.map((faq, i) => ({ ...faq, _key: `faq-${i}` })),
      sources: post.sources.map((source, i) => ({ ...source, _key: `src-${i}` })),
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt ?? undefined,
      noindex: post.noindex,
      featured: false,
      ...(post.topic ? { topic: { _type: "reference", _ref: topicId(post.topic.slug) } } : {}),
      author: { _type: "reference", _ref: authorId(post.author.slug) },
      /* cover is NOT seeded. The local demo cover is a file in /public; the
       * schema's cover field is a Cloudinary reference, and there is no honest
       * way to fabricate one. Upload it in the Studio — that is the one manual
       * step, and it is a thirty-second job. */
    });
    report("post  ", post.title, !before);
  }

  const settingsBefore = await client.getDocument("siteSettings");
  await client.createIfNotExists({
    _id: "siteSettings",
    _type: "siteSettings",
    title: localSettings.title,
    lede: localSettings.lede,
    description: localSettings.description,
  });
  report("settings", localSettings.title, !settingsBefore);

  console.log(`\n  ${created} created, ${skipped} already present.`);
  console.log(`\n  Next: open /blog/studio, add a Cloudinary cover to the post, publish.\n`);
}

main().catch((error: unknown) => {
  console.error("\n  ✗ Seeding failed:", error instanceof Error ? error.message : error, "\n");
  process.exit(1);
});
