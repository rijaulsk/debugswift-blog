import { defineArrayMember, defineField, defineType } from "sanity";

/* A post.
 *
 * Several fields are required that most blog CMSs treat as optional. That is
 * the whole design: the fields below are the ones that decide whether a post
 * can win a featured snippet, be quoted by an answer engine, or be cited by a
 * model — and optional SEO fields are fields nobody fills in. shortAnswer and
 * excerpt are required for that reason, not to be strict for its own sake. */
export default defineType({
  name: "post",
  title: "Post",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "answer", title: "Answer engine" },
    { name: "meta", title: "Metadata & SEO" },
  ],
  fields: [
    defineField({
      name: "title",
      type: "string",
      group: "content",
      description:
        "One question, phrased the way an owner would actually ask it — \"Why does my spreadsheet keep breaking?\", not \"5 Productivity Hacks\". See content-guidelines.md.",
      validation: (r) => r.required().max(90),
    }),
    defineField({
      name: "slug",
      type: "slug",
      group: "content",
      options: { source: "title", maxLength: 72 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "excerpt",
      type: "text",
      rows: 3,
      group: "content",
      description:
        "Card copy and meta description. Under 160 characters or search engines truncate it mid-sentence.",
      validation: (r) => r.required().max(160),
    }),
    defineField({
      name: "shortAnswer",
      title: "Short answer",
      type: "text",
      rows: 3,
      group: "answer",
      description:
        "40–60 words answering the title directly, in plain language, standing entirely on its own. This is the block a featured snippet lifts and the paragraph a model quotes — it must make sense to someone who has read nothing else on the page.",
      validation: (r) =>
        r
          .required()
          .custom((value) => {
            if (typeof value !== "string") return true;
            const words = value.trim().split(/\s+/).filter(Boolean).length;
            if (words < 30) return "Too short to answer the question — aim for 40–60 words.";
            if (words > 80) return "Too long to be lifted as an answer — aim for 40–60 words.";
            return true;
          }),
    }),
    defineField({
      name: "keyTakeaways",
      title: "Key takeaways",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      group: "answer",
      description:
        "Two to five self-contained sentences. Each one has to survive being read on its own, out of order, with no surrounding paragraph — that is exactly how an answer engine will use them.",
      validation: (r) => r.max(5),
    }),
    defineField({
      name: "body",
      type: "postBody",
      group: "content",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "faqs",
      title: "Closing FAQ",
      type: "array",
      group: "answer",
      description:
        "Optional. Compiles into FAQPage structured data alongside any faqBlock in the body.",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "question", type: "string", validation: (r) => r.required() }),
            defineField({ name: "answer", type: "text", rows: 4, validation: (r) => r.required() }),
          ],
          preview: { select: { title: "question", subtitle: "answer" } },
        }),
      ],
    }),
    defineField({
      name: "sources",
      title: "Sources",
      type: "array",
      group: "answer",
      description:
        "Anything the post relies on that isn't ours. Rendered as a reference list — attributable claims are what get cited.",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "label", type: "string", validation: (r) => r.required() }),
            defineField({ name: "url", type: "url", validation: (r) => r.required() }),
          ],
          preview: { select: { title: "label", subtitle: "url" } },
        }),
      ],
    }),
    defineField({
      name: "cover",
      title: "Cover image",
      type: "cloudinary.asset",
      group: "content",
    }),
    defineField({
      name: "coverAlt",
      title: "Cover alt text",
      type: "string",
      group: "content",
      description: "What the cover shows, for someone who cannot see it.",
      validation: (r) =>
        r.max(180).custom((value, ctx) => {
          const doc = ctx.document as { cover?: { public_id?: string } } | undefined;
          if (doc?.cover?.public_id && !value?.trim()) {
            return "A cover image needs alt text.";
          }
          return true;
        }),
    }),
    defineField({
      name: "topic",
      type: "reference",
      to: [{ type: "topic" }],
      group: "content",
      description:
        "One topic, never several. A post in two clusters competes with itself for the same query.",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "author",
      type: "reference",
      to: [{ type: "author" }],
      group: "content",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "publishedAt",
      title: "Published",
      type: "datetime",
      group: "meta",
      initialValue: () => new Date().toISOString(),
      validation: (r) => r.required(),
    }),
    defineField({
      name: "updatedAt",
      title: "Last substantially updated",
      type: "datetime",
      group: "meta",
      description:
        "Set this only when the post actually changed in substance. Bumping it for a typo is the freshness-gaming that gets a site discounted.",
    }),
    defineField({
      name: "redirectsFrom",
      title: "Old slugs",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      group: "meta",
      description:
        "Every slug this post used to live at. Each becomes a permanent redirect at build time, so renaming never throws away the links and rankings the old URL earned.",
    }),
    defineField({
      name: "seoTitle",
      title: "SEO title override",
      type: "string",
      group: "meta",
      description: "Leave empty to use the post title. Only fill this in when the two genuinely differ.",
      validation: (r) => r.max(70),
    }),
    defineField({
      name: "seoDescription",
      title: "SEO description override",
      type: "string",
      group: "meta",
      description: "Leave empty to use the excerpt.",
      validation: (r) => r.max(160),
    }),
    defineField({
      name: "noindex",
      title: "Hide from search engines",
      type: "boolean",
      group: "meta",
      initialValue: false,
      description:
        "Also removes the post from the sitemap, the feeds and llms.txt — a page told not to be indexed should not be advertised in five other places.",
    }),
    defineField({
      name: "featured",
      type: "boolean",
      group: "meta",
      initialValue: false,
      description: "Pins the post to the top of the index.",
    }),
  ],
  orderings: [
    {
      title: "Newest first",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
  preview: {
    select: { title: "title", subtitle: "topic.title", published: "publishedAt" },
    prepare: ({ title, subtitle, published }) => ({
      title,
      subtitle: [subtitle, published?.slice(0, 10)].filter(Boolean).join(" · "),
    }),
  },
});
