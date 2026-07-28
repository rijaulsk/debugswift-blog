import { localPosts } from "@/content";
import { TEMPLATE_MARKER } from "@/sanity/lib/postTemplate";
import {
  bodyHasNoBannedWords,
  bodyHasNoTiredPhrases,
  bodyLengthWarning,
  bodyLinksAService,
  noBannedWords,
  noTiredPhrases,
} from "@/sanity/lib/rules";
import type { Post } from "@/lib/types";

/* npm run check-content
 *
 * Runs the Studio's validation rules against the local content in content/.
 *
 * Those rules only fire inside Sanity, and there are two routes around them:
 * local content is never seen by Sanity at all, and `npm run seed` writes
 * through the API, which does not validate. So without this, the house rules
 * apply to everything except the one post that shipped with the repo — and the
 * first time anyone discovers the demo post fails its own gate is when they
 * open it in the Studio after seeding.
 *
 * Exits non-zero on a blocking failure, so it can go in CI later.
 */

type Check = { name: string; blocking: boolean; result: true | string };

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

function checksFor(post: Post): Check[] {
  return [
    { name: "title: banned words", blocking: true, result: noBannedWords(post.title) },
    {
      name: "title: <= 90 characters",
      blocking: true,
      result: post.title.length <= 90 || `${post.title.length} characters`,
    },
    { name: "title: tired phrases", blocking: false, result: noTiredPhrases(post.title) },

    { name: "excerpt: banned words", blocking: true, result: noBannedWords(post.excerpt) },
    {
      name: "excerpt: <= 160 characters",
      blocking: true,
      result: post.excerpt.length <= 160 || `${post.excerpt.length} characters`,
    },
    { name: "excerpt: tired phrases", blocking: false, result: noTiredPhrases(post.excerpt) },

    { name: "short answer: banned words", blocking: true, result: noBannedWords(post.shortAnswer) },
    {
      name: "short answer: 40-60 words (30-80 allowed)",
      blocking: true,
      result:
        words(post.shortAnswer) >= 30 && words(post.shortAnswer) <= 80
          ? true
          : `${words(post.shortAnswer)} words`,
    },
    {
      name: "short answer: tired phrases",
      blocking: false,
      result: noTiredPhrases(post.shortAnswer),
    },

    { name: "body: banned words", blocking: true, result: bodyHasNoBannedWords(post.body) },
    { name: "body: links a service page", blocking: true, result: bodyLinksAService(post.body) },
    {
      name: "body: template scaffolding removed",
      blocking: true,
      result: JSON.stringify(post.body).includes(TEMPLATE_MARKER)
        ? "the template instructions are still in the body"
        : true,
    },
    { name: "body: tired phrases", blocking: false, result: bodyHasNoTiredPhrases(post.body) },
    { name: "body: 800-1500 words", blocking: false, result: bodyLengthWarning(post.body) },

    {
      name: "key takeaways: at most 5",
      blocking: true,
      result: post.keyTakeaways.length <= 5 || `${post.keyTakeaways.length}`,
    },
    { name: "topic set", blocking: true, result: Boolean(post.topic) || "no topic" },
    { name: "author set", blocking: true, result: Boolean(post.author) || "no author" },
    {
      name: "cover has alt text",
      blocking: true,
      result: !post.cover || Boolean(post.cover.alt.trim()) || "cover has no alt text",
    },
    {
      name: "closing CTA is in the body",
      blocking: false,
      /* The CTA card is page chrome and never reaches the markdown export, the
       * feeds or llms-full.txt — so a reader who arrives through any of those
       * gets the argument and no next step. */
      result: JSON.stringify(post.body).includes("/contact")
        ? true
        : "no /contact link in the body — the feeds and markdown export will have no CTA",
    },
  ];
}

let blocking = 0;
let warnings = 0;

console.log(`\n  Checking ${localPosts.length} local post(s) against the Studio rules\n`);

for (const post of localPosts) {
  console.log(`  ${post.slug}`);
  for (const check of checksFor(post)) {
    if (check.result === true) {
      console.log(`    PASS  ${check.name}`);
    } else if (check.blocking) {
      blocking += 1;
      console.log(`    FAIL  ${check.name}\n          ${check.result}`);
    } else {
      warnings += 1;
      console.log(`    WARN  ${check.name}\n          ${check.result}`);
    }
  }
  console.log("");
}

console.log(`  ${blocking} blocking failure(s), ${warnings} warning(s).`);
console.log(
  blocking === 0
    ? "  Local content satisfies every rule the Studio enforces.\n"
    : "  Local content would NOT publish. Fix the failures above.\n",
);

process.exit(blocking === 0 ? 0 : 1);
