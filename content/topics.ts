import type { Topic } from "@/lib/types";

/* Topics = pillar pages, not tags. See sanity/schemaTypes/topic.ts for why the
 * distinction is load-bearing.
 *
 * Five to start, each mapped to exactly one main-site service so the cluster
 * has somewhere to send a reader who has finished reading and wants the fix.
 * Five is a deliberate ceiling for a blog with one post: a topic with no posts
 * under it is a thin page, and eleven empty topics — one per service — would be
 * eleven of them.
 *
 * `pillar` is null on all of them for now. Per the schema's own note, the
 * pillar body gets written before the third post lands in a topic; until then
 * the hub renders as a listing and is excluded from the sitemap (see
 * app/sitemap.ts) rather than shipped as thin content. */

export const answeringEnquiries: Topic = {
  slug: "answering-enquiries",
  title: "Answering enquiries",
  description:
    "What happens to the messages that arrive when nobody's watching, and how businesses cover the hours they aren't working.",
  pillar: null,
  cover: null,
  serviceSlug: "ai-automation",
};

export const automatingBusywork: Topic = {
  slug: "automating-busywork",
  title: "Automating the busywork",
  description:
    "The repetitive steps between an enquiry and an invoice — quotes, reminders, handoffs, reporting — and which of them software should be doing.",
  pillar: null,
  cover: null,
  serviceSlug: "business-process-automation",
};

export const websitesThatEarn: Topic = {
  slug: "websites-that-earn",
  title: "Websites that earn their keep",
  description:
    "Why sites get visitors and no enquiries, and what changes when a site is built backwards from the action instead of forwards from the brochure.",
  pillar: null,
  cover: null,
  serviceSlug: "conversion-websites",
};

export const gettingFound: Topic = {
  slug: "getting-found",
  title: "Getting found",
  description:
    "The unglamorous structural work that decides whether you appear when someone nearby searches for exactly what you sell.",
  pillar: null,
  cover: null,
  serviceSlug: "seo-local-lead-gen",
};

export const buyingTechnology: Topic = {
  slug: "buying-technology",
  title: "Buying technology well",
  description:
    "How to read a quote, compare two vendors saying opposite things, and tell a fair price from a padded one before you commit budget.",
  pillar: null,
  cover: null,
  serviceSlug: "technical-consulting",
};

export const localTopics: Topic[] = [
  answeringEnquiries,
  automatingBusywork,
  websitesThatEarn,
  gettingFound,
  buyingTechnology,
];
