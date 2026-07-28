import { defineArrayMember, defineField, defineType } from "sanity";

/* Body block types.
 *
 * Every one of these exists to produce a specific machine-readable output, not
 * to give an editor more ways to decorate a paragraph:
 *
 *   figure          → an image that cannot cause layout shift
 *   calloutBlock    → visual emphasis with no schema consequence (the only one)
 *   faqBlock        → FAQPage JSON-LD
 *   stepsBlock      → HowTo JSON-LD
 *   comparisonTable → tables are disproportionately snippet-eligible
 *   serviceLink     → the blog → services link every post owes
 *   sourcedStat     → a number that CANNOT be published without its source
 *   codeBlock       → monospace, no highlighting library
 *
 * Adding a block type without a reason from that list is how a CMS turns into a
 * page builder. Don't. */

export const figure = defineType({
  name: "figure",
  title: "Image",
  type: "object",
  fields: [
    defineField({
      name: "asset",
      title: "Image",
      type: "cloudinary.asset",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "alt",
      title: "Alt text",
      type: "string",
      description:
        "What the image shows, for someone who cannot see it. Describe it for THIS post — the same asset in another post usually needs a different sentence. Leave empty only if the image is purely decorative.",
      validation: (r) => r.max(180),
    }),
    defineField({ name: "caption", title: "Caption", type: "string" }),
  ],
  preview: {
    select: { title: "alt", subtitle: "caption" },
    prepare: ({ title, subtitle }) => ({
      title: title || "Image",
      subtitle,
    }),
  },
});

export const calloutBlock = defineType({
  name: "calloutBlock",
  title: "Callout",
  type: "object",
  fields: [
    defineField({
      name: "tone",
      type: "string",
      initialValue: "note",
      options: {
        list: [
          { title: "Note", value: "note" },
          { title: "Watch out", value: "warning" },
        ],
        layout: "radio",
      },
    }),
    defineField({ name: "title", type: "string" }),
    defineField({
      name: "text",
      type: "text",
      rows: 3,
      validation: (r) => r.required(),
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "text" },
    prepare: ({ title, subtitle }) => ({
      title: title || "Callout",
      subtitle,
    }),
  },
});

export const faqBlock = defineType({
  name: "faqBlock",
  title: "FAQ",
  type: "object",
  description:
    "Renders as an accordion AND compiles into FAQPage structured data. Use real questions a reader would type, not headings phrased as questions.",
  fields: [
    defineField({
      name: "items",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              name: "question",
              type: "string",
              validation: (r) => r.required(),
            }),
            defineField({
              name: "answer",
              type: "text",
              rows: 4,
              validation: (r) => r.required(),
            }),
          ],
          preview: { select: { title: "question", subtitle: "answer" } },
        }),
      ],
      validation: (r) => r.required().min(1),
    }),
  ],
  preview: {
    select: { items: "items" },
    prepare: ({ items }) => ({
      title: "FAQ",
      subtitle: `${items?.length ?? 0} question${items?.length === 1 ? "" : "s"}`,
    }),
  },
});

export const stepsBlock = defineType({
  name: "stepsBlock",
  title: "Steps",
  type: "object",
  description:
    "A genuine ordered procedure. Compiles into HowTo structured data — so do not use it for a list that happens to have three items.",
  fields: [
    defineField({ name: "title", type: "string" }),
    defineField({
      name: "steps",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              name: "title",
              type: "string",
              validation: (r) => r.required(),
            }),
            defineField({ name: "text", type: "text", rows: 3 }),
          ],
          preview: { select: { title: "title", subtitle: "text" } },
        }),
      ],
      validation: (r) => r.required().min(2),
    }),
  ],
  preview: {
    select: { title: "title", steps: "steps" },
    prepare: ({ title, steps }) => ({
      title: title || "Steps",
      subtitle: `${steps?.length ?? 0} steps`,
    }),
  },
});

export const comparisonTable = defineType({
  name: "comparisonTable",
  title: "Comparison table",
  type: "object",
  fields: [
    defineField({ name: "caption", type: "string" }),
    defineField({
      name: "columns",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      validation: (r) => r.required().min(2).max(4),
      description: "Header cells. Two to four — anything wider stops working on a phone.",
    }),
    defineField({
      name: "rows",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              name: "cells",
              type: "array",
              of: [defineArrayMember({ type: "string" })],
            }),
          ],
          preview: {
            select: { cells: "cells" },
            prepare: ({ cells }) => ({ title: cells?.join(" · ") || "Row" }),
          },
        }),
      ],
      validation: (r) => r.required().min(1),
    }),
  ],
  preview: {
    select: { title: "caption", rows: "rows" },
    prepare: ({ title, rows }) => ({
      title: title || "Comparison table",
      subtitle: `${rows?.length ?? 0} rows`,
    }),
  },
});

export const serviceLink = defineType({
  name: "serviceLink",
  title: "Service link",
  type: "object",
  description:
    "An inline card pointing at a service page on the main site. Every post owes at least one — services ↔ blog ↔ tools is the internal link triangle the whole SEO plan rests on.",
  fields: [
    defineField({
      name: "serviceSlug",
      title: "Service",
      type: "string",
      validation: (r) => r.required(),
      options: {
        list: [
          { title: "AI Automation & Chatbots", value: "ai-automation" },
          { title: "AI Integration", value: "ai-integration" },
          { title: "Business Process Automation", value: "business-process-automation" },
          { title: "Custom Web Apps & SaaS", value: "web-apps-saas" },
          { title: "Web & App Development", value: "web-app-development" },
          { title: "Conversion Websites", value: "conversion-websites" },
          { title: "Landing Pages & Ad Campaigns", value: "landing-pages-ad-campaigns" },
          { title: "SEO & Local Visibility", value: "seo-local-lead-gen" },
          { title: "Brand & Design Systems", value: "brand-design-systems" },
          { title: "E-commerce", value: "ecommerce" },
          { title: "Technical Consulting", value: "technical-consulting" },
          { title: "The Lead Engine (flagship)", value: "lead-engine" },
        ],
      },
    }),
    defineField({
      name: "blurb",
      type: "text",
      rows: 2,
      description:
        "One sentence on why THIS post's reader would want that page. Not the service's own tagline.",
      validation: (r) => r.required().max(200),
    }),
  ],
  preview: {
    select: { title: "serviceSlug", subtitle: "blurb" },
  },
});

export const sourcedStat = defineType({
  name: "sourcedStat",
  title: "Sourced statistic",
  type: "object",
  description:
    "The ONLY way to publish a number that isn't a product spec or the reader's own arithmetic. The source is required and rendered — a statistic without provenance is exactly the invented proof the honesty rules forbid.",
  fields: [
    defineField({
      name: "value",
      type: "string",
      description: "The number as it should read, e.g. \"78%\" or \"4 hours\".",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "label",
      type: "string",
      description: "What the number measures.",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "sourceLabel",
      type: "string",
      description: "Who published it, e.g. \"Ofcom, 2025\".",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "sourceUrl",
      type: "url",
      validation: (r) => r.required(),
    }),
  ],
  preview: {
    select: { title: "value", subtitle: "sourceLabel" },
  },
});

export const codeBlock = defineType({
  name: "codeBlock",
  title: "Code",
  type: "object",
  fields: [
    defineField({ name: "language", type: "string" }),
    defineField({
      name: "code",
      type: "text",
      rows: 8,
      validation: (r) => r.required(),
    }),
  ],
  preview: {
    select: { title: "language", subtitle: "code" },
    prepare: ({ title, subtitle }) => ({ title: title || "Code", subtitle }),
  },
});

/* The rich-text field itself.
 *
 * H1 is absent on purpose: the post title is the page's only H1, and letting an
 * editor add a second one inside the body breaks the document outline every
 * heading-based feature depends on (table of contents, SERP jump links, the
 * markdown export). Styles stop at H3 for the same reason — a post that needs
 * H4 is two posts. */
export const bodyType = defineType({
  name: "postBody",
  title: "Body",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Paragraph", value: "normal" },
        { title: "Heading", value: "h2" },
        { title: "Subheading", value: "h3" },
        { title: "Quote", value: "blockquote" },
      ],
      lists: [
        { title: "Bullet", value: "bullet" },
        { title: "Numbered", value: "number" },
      ],
      marks: {
        decorators: [
          { title: "Bold", value: "strong" },
          { title: "Italic", value: "em" },
          { title: "Code", value: "code" },
        ],
        annotations: [
          {
            name: "link",
            type: "object",
            title: "Link",
            fields: [
              defineField({
                name: "href",
                type: "url",
                title: "URL",
                validation: (r) =>
                  r.required().uri({ scheme: ["http", "https", "mailto", "tel"] }),
              }),
              defineField({
                name: "nofollow",
                type: "boolean",
                title: "Nofollow",
                description:
                  "Forced on for every outbound link in a guest post, regardless of this switch.",
                initialValue: false,
              }),
            ],
          },
        ],
      },
    }),
    defineArrayMember({ type: "figure" }),
    defineArrayMember({ type: "calloutBlock" }),
    defineArrayMember({ type: "faqBlock" }),
    defineArrayMember({ type: "stepsBlock" }),
    defineArrayMember({ type: "comparisonTable" }),
    defineArrayMember({ type: "serviceLink" }),
    defineArrayMember({ type: "sourcedStat" }),
    defineArrayMember({ type: "codeBlock" }),
  ],
});
