import { defineArrayMember, defineField, defineType } from "sanity";

/* A guest pitch — created by the PUBLIC, through /write-for-us.
 *
 * This is the only document type a stranger can create, and it is why the
 * pipeline is split in two. The pitch form is open to anyone, so it is also
 * open to every scraper on the internet; it therefore accepts a few short
 * fields and nothing else. The full draft goes through guestDraft, which is
 * unreachable without an invite token the owner issues by approving a pitch.
 *
 * Spam can reach this queue. It cannot reach the draft queue, and it can never
 * reach the site — a post is published by a human pressing publish, always.
 *
 * The `inviteToken` is written by the Approve action, never by the form. */
export default defineType({
  name: "guestPitch",
  title: "Guest pitch",
  type: "document",
  readOnly: true, // Editors act on these through the document actions, not by typing.
  fields: [
    defineField({ name: "name", type: "string" }),
    defineField({ name: "email", type: "string" }),
    defineField({
      name: "topicIdea",
      title: "Topic",
      type: "string",
      description: "The owner question they want to answer.",
    }),
    defineField({
      name: "angle",
      type: "text",
      rows: 5,
      description: "What they'd argue, and why they can.",
    }),
    defineField({ name: "bio", type: "text", rows: 3 }),
    defineField({
      name: "samples",
      title: "Published work",
      type: "array",
      of: [defineArrayMember({ type: "url" })],
    }),
    defineField({
      name: "status",
      type: "string",
      initialValue: "new",
      options: {
        list: [
          { title: "New", value: "new" },
          { title: "Approved — invite issued", value: "approved" },
          { title: "Draft received", value: "drafted" },
          { title: "Declined", value: "declined" },
        ],
      },
    }),
    defineField({
      name: "inviteToken",
      title: "Invite token",
      type: "string",
      description:
        "Single-use. Written by the \"Approve & issue link\" action, never by the form. Anyone holding it can submit one draft.",
    }),
    defineField({ name: "inviteExpires", title: "Invite expires", type: "datetime" }),
    defineField({ name: "submittedAt", type: "datetime" }),
  ],
  orderings: [
    { title: "Newest first", name: "submittedAtDesc", by: [{ field: "submittedAt", direction: "desc" }] },
  ],
  preview: {
    select: { title: "topicIdea", name: "name", status: "status" },
    prepare: ({ title, name, status }) => ({
      title: title || "Untitled pitch",
      subtitle: [name, status].filter(Boolean).join(" · "),
    }),
  },
});
