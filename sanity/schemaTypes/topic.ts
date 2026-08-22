import { defineField, defineType } from "sanity";

import { SERVICE_TITLES, TOPIC_SERVICE_SLUGS } from "@/sanity/lib/services";

/* A topic is a PILLAR PAGE, not a tag.
 *
 * The difference is the `pillar` field. A tag page is a filtered list — thin,
 * duplicative, and the reason large blogs accumulate thousands of URLs that
 * compete with their own articles for the same query. A pillar page has a body
 * of its own: it answers the broad version of the question, then links down to
 * the posts that answer the narrow versions, and every one of those links back
 * up. That is the cluster.
 *
 * There is deliberately NO tag document type in this repo. If a post doesn't
 * belong under one of these topics, the answer is usually that the topic list
 * is wrong, not that the post needs a looser label. */
export default defineType({
  name: "topic",
  title: "Topic",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (r) => r.required().max(60),
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title", maxLength: 60 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "description",
      type: "text",
      rows: 3,
      description: "Meta description and the hub's lede. Under 160 characters.",
      validation: (r) => r.required().max(160),
    }),
    defineField({
      name: "pillar",
      title: "Pillar body",
      type: "postBody",
      description:
        "The broad answer this whole cluster sits under. Without it this page is a tag list, and tag lists are the thin content that drags a domain down. Write it before publishing the third post in the topic.",
    }),
    defineField({
      name: "serviceSlug",
      title: "Related service",
      type: "string",
      description:
        "The main-site service this topic maps to. Drives the hub's link across to /services — the other half of the internal link triangle.",
      options: {
        /* Derived from the one list, minus the Lead Engine: that is a product
         * page, not a service, so a topic hub never maps to it. A serviceLink
         * block inside a post still can. */
        list: TOPIC_SERVICE_SLUGS.map((value) => ({
          title: SERVICE_TITLES[value],
          value,
        })),
      },
    }),
    defineField({ name: "cover", title: "Cover image", type: "cloudinary.asset" }),
    defineField({
      name: "coverAlt",
      title: "Cover alt text",
      type: "string",
      validation: (r) => r.max(180),
    }),
    defineField({
      name: "order",
      type: "number",
      description: "Sort position on /topics. Lower first.",
      initialValue: 100,
    }),
  ],
  orderings: [
    { title: "Manual order", name: "orderAsc", by: [{ field: "order", direction: "asc" }] },
  ],
  preview: { select: { title: "title", subtitle: "description" } },
});
