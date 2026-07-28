import { defineField, defineType } from "sanity";

/* A submitted guest draft. Created only against a valid invite token issued by
 * approving a guestPitch — see guestPitch.ts for why the pipeline has two steps.
 *
 * The body arrives as plain text/markdown rather than Portable Text: the public
 * endpoint accepts a string, which cannot smuggle a block type, an embedded
 * asset reference, or a mark annotation into the content model. Converting it
 * into real blocks is the "Create post from draft" action, run by the owner
 * after reading it. */
export default defineType({
  name: "guestDraft",
  title: "Guest draft",
  type: "document",
  readOnly: true,
  fields: [
    defineField({ name: "title", type: "string" }),
    defineField({
      name: "pitch",
      type: "reference",
      to: [{ type: "guestPitch" }],
      description: "The approved pitch this draft came in against.",
    }),
    defineField({ name: "authorName", type: "string" }),
    defineField({ name: "authorEmail", type: "string" }),
    defineField({ name: "authorBio", type: "text", rows: 3 }),
    defineField({
      name: "body",
      type: "text",
      rows: 30,
      description: "As submitted. Plain text / markdown.",
    }),
    defineField({
      name: "status",
      type: "string",
      initialValue: "received",
      options: {
        list: [
          { title: "Received", value: "received" },
          { title: "In review", value: "review" },
          { title: "Converted to post", value: "converted" },
          { title: "Declined", value: "declined" },
        ],
      },
    }),
    defineField({ name: "submittedAt", type: "datetime" }),
  ],
  orderings: [
    { title: "Newest first", name: "submittedAtDesc", by: [{ field: "submittedAt", direction: "desc" }] },
  ],
  preview: {
    select: { title: "title", subtitle: "authorName", status: "status" },
    prepare: ({ title, subtitle, status }) => ({
      title: title || "Untitled draft",
      subtitle: [subtitle, status].filter(Boolean).join(" · "),
    }),
  },
});
