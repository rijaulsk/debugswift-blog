import type { Post } from "@/lib/types";
import { missingEnquiriesAtNight } from "@/content/posts/missing-enquiries-at-night";

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
export const localPosts: Post[] = [missingEnquiriesAtNight];

export const localSettings = {
  title: "The DebugSwift blog",
  lede: "Plain-language write-ups on what technology is worth paying for, what isn't, and how to tell the difference — written for people running a business, not for other agencies.",
  description:
    "Plain-language write-ups on what technology is worth paying for, what isn't, and how to tell the difference. From DebugSwift, a founder-led agency in Kolkata.",
  featuredSlug: null as string | null,
};
