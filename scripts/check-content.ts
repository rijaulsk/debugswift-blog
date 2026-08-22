import { localPosts } from "@/content";
import {
  fromPost,
  summarise,
  validatePost,
  type CheckId,
  type CheckResult,
} from "@/sanity/lib/validatePost";

/* npm run check-content
 *
 * Runs the Studio's validation rules against the local content in content/.
 *
 * Those rules only fire inside Sanity, and there are two routes around them:
 * local content is never seen by Sanity at all, and `npm run seed` writes
 * through the API, which does not validate. So without this, the house rules
 * apply to everything except the posts that shipped with the repo — and the
 * first time anyone discovers a demo post fails its own gate is when they open
 * it in the Studio after seeding.
 *
 * The rules themselves live in sanity/lib/validatePost.ts, which the Studio and
 * `npm run push` also call. This file is only the printer.
 *
 * Exits non-zero on a blocking failure, so it can go in CI later.
 */

/* lib/types.ts's Post has no originality fields — they exist only in Sanity, so
 * there is nothing here to check. They are SKIPPED rather than silently passed,
 * and printed as SKIP, so the tally never overstates what was checked. */
const NOT_IN_LOCAL_CONTENT: CheckId[] = [
  "originality.recorded",
  "originality.notFuture",
];

const label = (check: CheckResult): string => {
  if (check.skipped) return "SKIP";
  if (check.result === true) return "PASS";
  return check.severity === "error" ? "FAIL" : "WARN";
};

let errors = 0;
let warnings = 0;

console.log(`\n  Checking ${localPosts.length} local post(s) against the Studio rules\n`);

for (const post of localPosts) {
  console.log(`  ${post.slug}`);

  const results = validatePost(fromPost(post), { skip: NOT_IN_LOCAL_CONTENT });

  for (const check of results) {
    console.log(`    ${label(check)}  ${check.name}`);
    if (!check.skipped && check.result !== true) {
      console.log(`          ${check.result}`);
    }
  }

  const summary = summarise(results);
  errors += summary.errors.length;
  warnings += summary.warnings.length;
  console.log("");
}

console.log(`  ${errors} blocking failure(s), ${warnings} warning(s).`);
console.log(
  errors === 0
    ? "  Local content satisfies every rule the Studio enforces.\n"
    : "  Local content would NOT publish. Fix the failures above.\n",
);

process.exit(errors === 0 ? 0 : 1);
