import type { SanityClient } from "@sanity/client";

import { fromSanityDoc, summarise, validatePost } from "@/sanity/lib/validatePost";
import { readEnv, writeClient } from "@/scripts/lib/env";

/* npm run publish-due [-- --dry-run]
 *
 * Publishes any post whose scheduled time has passed, then asks the site to
 * revalidate. Run on a timer; see .github/workflows/scheduled-publish.yml.
 *
 * WHAT THIS IS AND IS NOT. It is not a decision-maker. Every post it touches
 * was already approved by a person in the Studio — the "Schedule for…" action
 * refuses to queue anything that would fail validation, so the cover and the
 * originality check are done before a post can ever reach this queue. This job
 * presses a button on a schedule; it has no judgement to exercise.
 *
 * It re-validates anyway. Between scheduling and firing, somebody can unset a
 * cover or edit the body — and a queue that trusts a decision made last week is
 * a queue that publishes a broken post at six in the morning. A post that no
 * longer validates is SKIPPED AND LEFT QUEUED, never silently published and
 * never silently unscheduled: the next run picks it up once the problem is
 * fixed, and the run reports it loudly.
 *
 * Publishing a draft in Sanity means writing its content to the published id
 * and deleting the draft. There is no publish() on the client — the draft is
 * the pending edit, and removing it is what makes the change live.
 */

type QueuedPost = {
  _id: string;
  _rev: string;
  slug?: { current?: string };
  title?: string;
  scheduledFor?: string;
};

const out = (line = "") => console.log(line);

const DUE_QUERY = `
  *[_type == "post"
    && _id in path("drafts.**")
    && defined(scheduledFor)
    && scheduledFor <= $now
  ] | order(scheduledFor asc) { _id, _rev, slug, title, scheduledFor }
`;

async function revalidate(): Promise<string> {
  const base = process.env.BLOG_PUBLIC_ORIGIN?.trim();
  const secret = process.env.REVALIDATE_SECRET?.trim();

  if (!base) return "skipped — BLOG_PUBLIC_ORIGIN is not set";
  if (!secret) return "skipped — REVALIDATE_SECRET is not set";

  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/blog/api/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ reason: "scheduled-publish" }),
    });
    return response.ok ? "ok" : `HTTP ${response.status}`;
  } catch (error) {
    return `failed — ${(error as Error).message}`;
  }
}

async function publishOne(client: SanityClient, draft: QueuedPost): Promise<void> {
  const publishedId = draft._id.replace(/^drafts\./, "");
  const document = (await client.getDocument(draft._id)) as Record<string, unknown> | undefined;
  if (!document) throw new Error(`${draft._id} vanished between query and read`);

  const { _id, _rev, scheduledFor, scheduledBy, ...content } = document as Record<
    string,
    unknown
  > & { _id: string; _rev: string };
  void _id;
  void scheduledFor;
  void scheduledBy;

  /* One transaction: guard, publish, remove the draft. Two separate calls could
   * leave a post published with its draft still queued, and the next run would
   * publish it all over again.
   *
   * The leading patch is the revision guard. transaction().delete() takes only
   * an id, so there is nowhere to put ifRevisionId — but a patch inside the
   * same transaction carries one, and if the revision has moved the WHOLE
   * transaction is rejected. Unsetting scheduledFor is a real thing to do here
   * (the post is about to go live) and doubles as the guard, so nothing is
   * wasted on a no-op mutation. */
  await client
    .transaction()
    .patch(client.patch(draft._id).ifRevisionId(_rev).unset(["scheduledFor", "scheduledBy"]))
    .createOrReplace({ ...content, _id: publishedId, _type: "post" })
    .delete(draft._id)
    .commit({ visibility: "async" });
}

async function main() {
  const dryRun = process.argv.slice(2).includes("--dry-run");
  const env = readEnv();
  const client = writeClient(env);
  const now = new Date().toISOString();

  /* perspective "raw", or this finds nothing at all. A token client filters
   * drafts out of a GROQ query by default, and every document this job exists
   * to publish is a draft. getDocument() is unaffected, which is why the bug
   * hides behind a query that returns an empty list rather than an error. */
  const due = await client
    .withConfig({ perspective: "raw" })
    .fetch<QueuedPost[]>(DUE_QUERY, { now });

  out();
  out(`  ${now}`);

  if (!due.length) {
    out("  · nothing due\n");
    return;
  }

  out(`  ${due.length} post(s) due\n`);

  let published = 0;
  let skipped = 0;

  for (const draft of due) {
    const slug = draft.slug?.current ?? draft._id;
    const document = (await client.getDocument(draft._id)) as Record<string, unknown> | undefined;

    if (!document) {
      out(`  · ${slug} — gone, nothing to do`);
      continue;
    }

    const checks = validatePost(fromSanityDoc(document));
    const summary = summarise(checks);

    if (!summary.ok) {
      skipped += 1;
      out(`  ✗ ${slug} — LEFT QUEUED, it no longer validates:`);
      for (const failure of summary.errors) out(`      ${failure.name}: ${failure.result}`);
      continue;
    }

    if (dryRun) {
      out(`  · ${slug} — would publish (scheduled ${draft.scheduledFor})`);
      continue;
    }

    await publishOne(client, draft);
    published += 1;
    out(`  ✓ ${slug} — published`);
  }

  out();

  if (dryRun) {
    out("  dry run — nothing was published\n");
    return;
  }

  if (published) {
    out(`  revalidate: ${await revalidate()}`);
  }

  out(`  ${published} published, ${skipped} left queued.\n`);

  /* A non-zero exit makes the scheduled job go red, which is the only way
   * anyone finds out a queued post has been silently stuck for a week. */
  if (skipped) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
