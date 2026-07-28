import { defineArrayMember, defineField, defineType } from "sanity";

/* An author document is a claim that a real person wrote something.
 *
 * The honesty rules (CLAUDE.md, and E:\debugswift\lib\team.ts, which is
 * deliberately empty and commented to say why) forbid inventing people, stock
 * faces and generated portraits. That applies here without exception: create an
 * author only for someone who exists and has agreed to be named. An empty
 * author list is a truthful statement about a young agency. A populated one
 * that isn't real is a lie a reader catches on the first search.
 *
 * The photo field is therefore optional and stays empty until a real
 * photograph exists — same rule as FOUNDER_PHOTO_READY on the main site. */
export default defineType({
  name: "author",
  title: "Author",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "name", maxLength: 60 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "role",
      type: "string",
      description:
        "\"Founder\", \"Guest contributor\". A role, not a credential — no titles nobody holds.",
      validation: (r) => r.required().max(60),
    }),
    defineField({
      name: "bio",
      type: "text",
      rows: 4,
      description:
        "Who they are and why they can speak to this. Two or three sentences. This is the E-E-A-T signal, so it has to be specific and true.",
      validation: (r) => r.required().max(400),
    }),
    defineField({
      name: "isGuest",
      title: "Guest contributor",
      type: "boolean",
      initialValue: false,
      description:
        "Adds the disclosure line to their posts and forces rel=\"nofollow ugc\" on every link in their bio and body. Not configurable per link — that switch is what keeps the domain clean.",
    }),
    defineField({
      name: "links",
      type: "array",
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
      name: "photo",
      type: "cloudinary.asset",
      description:
        "A real photograph of this person, or nothing. Never stock, never generated — see the note at the top of this file.",
    }),
    defineField({
      name: "photoAlt",
      type: "string",
      validation: (r) => r.max(180),
    }),
  ],
  preview: { select: { title: "name", subtitle: "role" } },
});
