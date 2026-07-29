import type { Post } from "@/lib/types";
import { isThisAgencyQuoteTooHigh } from "@/content/posts/is-this-agency-quote-too-high";
import { missingEnquiriesAtNight } from "@/content/posts/missing-enquiries-at-night";
import { spreadsheetKeepsBreaking } from "@/content/posts/spreadsheet-keeps-breaking";

export { localAuthors } from "@/content/authors";
export { localTopics } from "@/content/topics";

/* Local content — the blog's source of truth ONLY while Sanity is unconfigured.
 *
 * The instant NEXT_PUBLIC_SANITY_PROJECT_ID has a value, lib/content.ts stops
 * reading this folder entirely, even if the dataset is empty. That is the
 * point: a fallback that triggers on "Sanity returned nothing" would make a
 * misconfigured deploy look perfectly healthy. See the comment at the top of
 * lib/content.ts.
 *
 * `npm run seed` pushes these documents into Sanity, after which this folder is
 * a historical record rather than a live source. It is kept, not deleted: it is
 * what lets a fresh clone of this repo run with no accounts at all. */
/* Three posts, which is the launch bar from debugswift-assets/blog-repo-spec.md:
 * "the coming-soon page stays up until there are 3 posts worth someone's time —
 * never launch with one thin post". They sit in three different topics on
 * purpose, so the topic navigation and the related-posts logic are exercised by
 * real content rather than by a single entry.
 *
 * Order here is irrelevant — lib/content.ts sorts by publishedAt. */
export const localPosts: Post[] = [
  missingEnquiriesAtNight,
  spreadsheetKeepsBreaking,
  isThisAgencyQuoteTooHigh,
];

/* The blog's own photograph, carried over from the coming-soon page it used to
 * front in the main repo (E:\debugswift\app\blog\page.tsx). Alt text is that
 * page's approved wording, unchanged — it describes the same image.
 *
 * Dimensions are the file's real intrinsic size. Used in two places that must
 * agree: the index hero and the index's Open Graph card. */
export const BLOG_HERO = {
  src: "/photos/debugswift-blog-drafts-desk.webp",
  alt: "A notebook sketching the blog's structure — intro, key idea, sections — beside a clipped stack of typed drafts",
  width: 1400,
  height: 933,
  caption:
    "Practical guides, real examples, simple explanations. Written for the person running the business.",
};

export const localSettings = {
  title: "The DebugSwift blog",
  lede: "Plain-language write-ups on what technology is worth paying for, what isn't, and how to tell the difference — written for people running a business, not for other agencies.",
  description:
    "Plain-language write-ups on what technology is worth paying for, what isn't, and how to tell the difference. From DebugSwift, a founder-led agency in Kolkata.",
  featuredSlug: null as string | null,
};
