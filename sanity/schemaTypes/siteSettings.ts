import { defineField, defineType } from "sanity";

/* Singleton. Editable strings that would otherwise be hardcoded in a layout —
 * kept small on purpose. A settings document that grows into a page builder is
 * how a design system stops being enforceable in code. */
export default defineType({
  name: "siteSettings",
  title: "Blog settings",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
      initialValue: "The DebugSwift blog",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "lede",
      type: "text",
      rows: 3,
      description: "The index page's opening paragraph.",
      validation: (r) => r.required().max(280),
    }),
    defineField({
      name: "description",
      type: "text",
      rows: 3,
      description: "Meta description for the index. Under 160 characters.",
      validation: (r) => r.required().max(160),
    }),
    defineField({
      name: "featuredPost",
      type: "reference",
      to: [{ type: "post" }],
      description: "Optional. Overrides the newest-first rule for the lead slot.",
    }),
  ],
  preview: { prepare: () => ({ title: "Blog settings" }) },
});
