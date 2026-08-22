import { defineArrayMember, defineField, defineType } from "sanity";
import { postBodyTemplate } from "@/sanity/lib/postTemplate";
import {
  fromSanityDoc,
  validatePost,
  type CheckId,
  type CheckResult,
} from "@/sanity/lib/validatePost";

/* A post.
 *
 * Several fields are required that most blog CMSs treat as optional. That is
 * the whole design: the fields below are the ones that decide whether a post
 * can win a featured snippet, be quoted by an answer engine, or be cited by a
 * model — and optional SEO fields are fields nobody fills in. shortAnswer and
 * excerpt are required for that reason, not to be strict for its own sake.
 *
 * WHERE THE RULES LIVE. Structural constraints — required(), max(), min() —
 * stay on their fields, because Sanity does those natively and they drive the
 * asterisks, the live character counters and the disabled Publish button.
 * Everything that used to be a custom() has moved to the document-level rule at
 * the bottom of this file, which calls sanity/lib/validatePost.ts.
 *
 * The reason is not tidiness. Schema validation DOES NOT RUN ON API WRITES, so
 * `npm run seed` and `npm run push` never saw any of these rules. They now call
 * the same validatePost() this file does, which makes the Studio and the CLI
 * genuinely one gate instead of two that drift. */

/* Checks Sanity's own required()/max() already reports on the field itself.
 * Running them again at document level would show every message twice. */
const HANDLED_BY_FIELD_RULES: CheckId[] = [
  "title.length",
  "excerpt.length",
  "keyTakeaways.max",
  "topic.set",
  "author.set",
  "publishedAt.set",
  "originality.recorded",
];

/* Which field a message should attach itself to, where it is not simply the
 * check's own field group. */
const EXPLICIT_PATHS: Partial<Record<CheckId, string>> = {
  "cover.present": "cover",
  "cover.alt": "coverAlt",
  "originality.notFuture": "originalityCheckedAt",
};

const toValidationErrors = (results: CheckResult[], severity: "error" | "warning") =>
  results
    .filter((c) => !c.skipped && c.severity === severity && c.result !== true)
    .map((c) => ({
      message: String(c.result),
      path: [EXPLICIT_PATHS[c.id] ?? c.field],
    }));

const runChecks = (doc: unknown): CheckResult[] =>
  validatePost(fromSanityDoc((doc ?? {}) as Record<string, unknown>), {
    skip: HANDLED_BY_FIELD_RULES,
  });
export default defineType({
  name: "post",
  title: "Post",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "answer", title: "Answer engine" },
    { name: "audio", title: "Audio" },
    { name: "checks", title: "Pre-publish checks" },
    { name: "meta", title: "Metadata & SEO" },
  ],
  fields: [
    defineField({
      name: "title",
      type: "string",
      group: "content",
      description:
        "One question, phrased the way an owner would actually ask it — \"Why does my spreadsheet keep breaking?\", not \"5 Productivity Hacks\". See WRITING-GUIDE.md.",
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
      validation: (r) => r.required(),
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
      /* Every new post opens on the house structure rather than a blank page.
       * See sanity/lib/postTemplate.ts — and note the marker check below, which
       * is what stops the scaffolding being published as if it were writing. */
      initialValue: postBodyTemplate,
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
      validation: (r) => r.max(180),
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
    /* ---- Pre-publish checks ------------------------------------------------
     *
     * These are required, which means Sanity refuses to publish without them.
     * That is the point: "every post is checked for originality" is either a
     * claim you can back or one you shouldn't make, and a checklist in a
     * document is not a claim you can back.
     *
     * Especially true for AI-assisted drafts, which reproduce phrasing from
     * their training data without any intent to and without anyone noticing.
     * ------------------------------------------------------------------- */
    defineField({
      name: "originalityCheckedWith",
      title: "Originality checked with",
      type: "string",
      group: "checks",
      description:
        "Which tool, and at what setting. Free tiers are enough at this volume — Quetext, Copyleaks, or exact-phrase spot checks in Google for the ten most distinctive sentences. Record what you actually ran.",
      validation: (r) => r.required().min(3),
    }),
    defineField({
      name: "originalityCheckedAt",
      title: "Checked on",
      type: "date",
      group: "checks",
      /* A check dated in the future is a check nobody ran — enforced by the
       * document rule at the bottom of this file. */
      validation: (r) => r.required(),
    }),
    defineField({
      name: "originalityNotes",
      title: "Notes",
      type: "text",
      rows: 2,
      group: "checks",
      description:
        "Anything the check flagged and why it was fine — a quoted source, a common phrase, a product name.",
    }),

    /* ---- Audio ---------------------------------------------------------- */
    defineField({
      name: "audio",
      title: "Spoken version",
      type: "object",
      group: "audio",
      description:
        "Generated by `npm run audio <slug>` and uploaded to Cloudinary, or replaced with your own recording. Posts without audio simply show no player — nothing breaks.",
      fields: [
        defineField({
          name: "url",
          title: "Audio URL",
          type: "url",
          validation: (r) => r.uri({ scheme: ["https"] }),
        }),
        defineField({
          name: "durationSeconds",
          title: "Duration (seconds)",
          type: "number",
          validation: (r) => r.min(1),
        }),
        defineField({
          name: "voice",
          type: "string",
          description:
            "Which voice produced it, or \"Rijaul Sk\" for a real recording. Shown to the reader — a synthetic voice is disclosed, never passed off as a person.",
        }),
        defineField({ name: "generatedAt", type: "datetime" }),
      ],
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

    /* ---- Push provenance (hidden) ------------------------------------------
     *
     * Written only by `npm run push`. It is how the CLI tells "nobody has
     * touched this since I wrote it" from "a human has edited it in the
     * Studio": the hash covers the fields push owns, so a mismatch means
     * somebody changed one by hand and push refuses rather than overwriting.
     *
     * It lives on the document rather than in a repo file on purpose — a
     * drafts/.state.json would go stale across checkouts and machines, and this
     * is a fact ABOUT the document.
     *
     * `tool` is internal provenance for the owner. It is NOT reader-facing
     * disclosure, and it must never be added to postProjection in
     * sanity/lib/queries.ts — nothing here reaches the site.
     * --------------------------------------------------------------------- */
    defineField({
      name: "agentPush",
      title: "Push provenance",
      type: "object",
      group: "meta",
      hidden: true,
      fields: [
        defineField({ name: "hash", type: "string" }),
        /* A hash per owned field, as JSON, so a mismatch can name the field
         * somebody changed instead of shrugging at the whole document. A JSON
         * string rather than an object because the key set is dynamic. */
        defineField({ name: "fields", type: "text", rows: 2 }),
        defineField({ name: "at", type: "datetime" }),
        defineField({ name: "source", type: "string" }),
        defineField({ name: "tool", type: "string" }),
      ],
    }),
  ],
  /* One document-level rule instead of a dozen field-level custom() calls.
   *
   * Document level because several checks need more than their own field —
   * cover alt text depends on whether a cover exists, and the body checks read
   * block shapes. Returning ValidationError[] with a path attaches each message
   * to the field that has to change, so the editing experience is the same as
   * before while the implementation is shared with the CLI. */
  validation: (r) => [
    r.custom((doc) => {
      const errors = toValidationErrors(runChecks(doc), "error");
      return errors.length ? errors : true;
    }),
    r.warning().custom((doc) => {
      const warnings = toValidationErrors(runChecks(doc), "warning");
      return warnings.length ? warnings : true;
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
