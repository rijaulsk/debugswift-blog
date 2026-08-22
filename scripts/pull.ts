import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { fail, loadDotEnvLocal } from "@/scripts/lib/env";
import { toDraftMarkdown } from "@/scripts/lib/toDraftMarkdown";

/* npm run pull <slug>
 *
 * Writes drafts/<slug>.md from what is in Sanity, so an existing post can be
 * edited as a file and pushed back. It is also the honest way to start an
 * update: editing a stale draft file and pushing it would quietly revert
 * whatever happened in the Studio since.
 *
 * Reads through lib/content.ts like the site does, so what lands in the file is
 * what the pages actually render — not a second projection that could drift.
 *
 * NOTE THE DYNAMIC IMPORT, and do not "tidy" it into a top-level one.
 * lib/env.ts reads process.env when the MODULE is evaluated, and lib/content.ts
 * imports it. A static `import { getPost } from "@/lib/content"` is therefore
 * evaluated before loadDotEnvLocal() has run, IS_SANITY_CONFIGURED is false,
 * and getPost() quietly returns the local demo content instead of the real
 * post — which is exactly the silent fallback lib/content.ts's own header
 * comment exists to rule out. scripts/seed.ts defers its content/ import for a
 * related reason.
 */

async function main() {
  loadDotEnvLocal();

  const slug = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  if (!slug) fail("usage: npm run pull <slug>");

  const { IS_SANITY_CONFIGURED } = await import("@/lib/env");
  if (!IS_SANITY_CONFIGURED) {
    fail(
      "NEXT_PUBLIC_SANITY_PROJECT_ID is not set, so there is nothing to pull from. Add it to .env.local.",
    );
  }

  /* The draft first: if one exists it is newer than the published version by
   * definition, and pulling the published copy over a pending edit is how you
   * lose it. A post that has never been published has ONLY a draft. */
  const { getDraftPost, getPost } = await import("@/lib/content");
  const draft = await getDraftPost(slug);
  const post = draft ?? (await getPost(slug));
  if (!post) fail(`no post with slug "${slug}", published or draft`);
  if (draft) console.log("\n  · took the unpublished draft — it is newer than the live post");

  const dir = resolve(process.cwd(), "drafts");
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${slug}.md`);

  writeFileSync(path, toDraftMarkdown(post), "utf8");

  console.log(`\n  ✓ drafts/${slug}.md written from Sanity`);
  console.log(`\n    Edit it, then: npm run push ${slug} -- --dry-run\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
