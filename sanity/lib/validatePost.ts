import type { Post } from "@/lib/types";
import { TEMPLATE_MARKER } from "@/sanity/lib/postTemplate";
import {
  bodyHasNoBannedWords,
  bodyHasNoTiredPhrases,
  bodyLengthWarning,
  bodyLinksAService,
  noBannedWords,
  noTiredPhrases,
} from "@/sanity/lib/rules";
import { isServiceSlug, SERVICE_SLUGS } from "@/sanity/lib/services";

/* Every rule a post must satisfy, in ONE implementation.
 *
 * Before this file the same rules existed in two places and neither was
 * complete. The Studio held them inside defineField() closures in
 * schemaTypes/post.ts, where nothing outside Sanity could call them; and
 * scripts/check-content.ts re-implemented thirteen of them inline so the local
 * content in content/ could be checked at all. Two copies of a threshold is a
 * drift waiting to happen, and the array-shape rules in schemaTypes/blocks.ts
 * (steps min 2, table columns 2-4, and so on) were in neither copy.
 *
 * That mattered more than it looks, because Sanity's schema validation DOES NOT
 * RUN ON API WRITES. `npm run seed` and `npm run push` both write through the
 * client, so anything only enforced by a defineField rule is not enforced for
 * them at all. This file is what those scripts call instead.
 *
 * The result type is deliberately "every check, pass or fail" rather than a
 * boolean or a list of errors: scripts/check-content.ts prints PASS lines and is
 * a report, the push CLI prints only failures, and the Studio wants messages
 * with a field path. One return value serves all three.
 *
 * `true | string` for a result is not an accident either — it is the contract
 * Sanity's Rule.custom() already consumes, so these functions drop straight into
 * the schema. */

export type Severity = "error" | "warning";

export type CheckField =
  | "title"
  | "excerpt"
  | "shortAnswer"
  | "keyTakeaways"
  | "body"
  | "topic"
  | "author"
  | "cover"
  | "checks"
  | "meta";

export type CheckId =
  | "title.banned"
  | "title.length"
  | "title.tired"
  | "excerpt.banned"
  | "excerpt.length"
  | "excerpt.tired"
  | "shortAnswer.banned"
  | "shortAnswer.words"
  | "shortAnswer.tired"
  | "body.banned"
  | "body.tired"
  | "body.length"
  | "body.serviceLink"
  | "body.template"
  | "body.contactCta"
  | "body.stepsMin"
  | "body.faqMin"
  | "body.tableShape"
  | "body.statSourceUrl"
  | "body.serviceSlugValid"
  | "body.figureAlt"
  | "body.headingLevels"
  | "body.headingOrder"
  | "keyTakeaways.banned"
  | "keyTakeaways.max"
  | "faqs.banned"
  | "faqs.tired"
  | "topic.set"
  | "author.set"
  | "cover.present"
  | "cover.alt"
  | "originality.recorded"
  | "originality.notFuture"
  | "publishedAt.set";

export type CheckResult = {
  id: CheckId;
  /** Human label. The wording check-content.ts already printed, kept verbatim
   *  where a check existed before. */
  name: string;
  severity: Severity;
  /** true = passed. A string = the message shown to whoever has to fix it. */
  result: true | string;
  /** Set only when the caller declared it had no data for this check. The
   *  result is still returned rather than omitted, so the counts never lie
   *  about how much was actually checked. */
  skipped?: true;
  field: CheckField;
};

/**
 * The lowest common denominator of the three shapes that need validating: the
 * app's Post (check-content), a parsed draft file (push), and a raw Sanity
 * document (the Studio).
 *
 * References are reduced to booleans on purpose. The validator has no business
 * knowing what a _ref is, and a draft file's topic is a slug string that has not
 * been resolved to a document yet.
 */
export type ValidatablePost = {
  title: string;
  excerpt: string;
  shortAnswer: string;
  keyTakeaways: string[];
  body: unknown[];
  /* The CLOSING FAQ, which is a document field rather than a body block — so
   * nothing that scans `body` has ever seen it. It is prose a reader reads and
   * a search engine lifts into FAQPage structured data, and it was the one
   * place a banned word could reach a published page unchallenged. */
  faqs: { question: string; answer: string }[];
  hasTopic: boolean;
  hasAuthor: boolean;
  hasCover: boolean;
  coverAlt: string;
  originalityCheckedWith: string | null;
  originalityCheckedAt: string | null;
  publishedAt: string | null;
};

export type ValidateOptions = {
  /** Checks the caller has no data for. check-content passes the originality
   *  ids because lib/types.ts's Post does not carry those fields — they exist
   *  only in Sanity, and pretending to check them would be a lie. */
  skip?: CheckId[];
};

const words = (value: string): number => value.split(/\s+/).filter(Boolean).length;

type AnyBlock = Record<string, unknown> & { _type?: unknown };

const blocksOf = (body: unknown[], type: string): AnyBlock[] =>
  body.filter(
    (block): block is AnyBlock =>
      Boolean(block) && typeof block === "object" && (block as AnyBlock)._type === type,
  );

const arrayLength = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

const isBlank = (value: unknown): boolean =>
  typeof value !== "string" || value.trim().length === 0;

const plural = (n: number, noun: string): string => `${n} ${noun}${n === 1 ? "" : "s"}`;

/** Joins per-item complaints into one message, or returns true if there are none. */
const problems = (found: string[]): true | string => (found.length ? found.join("; ") : true);

/* ---------------------------------------------------------------- body shape */

/* These are the rules that live in schemaTypes/blocks.ts as min()/max() on
 * array fields. They are the ones an API write bypasses entirely, and the ones
 * an agent writing a draft file is most likely to get wrong. */

function checkStepsMin(body: unknown[]): true | string {
  return problems(
    blocksOf(body, "stepsBlock")
      .map((block, i) => ({ n: arrayLength(block.steps), i }))
      .filter(({ n }) => n < 2)
      .map(
        ({ n, i }) =>
          `steps block ${i + 1} has ${plural(n, "step")} — HowTo structured data needs at least 2`,
      ),
  );
}

function checkFaqMin(body: unknown[]): true | string {
  return problems(
    blocksOf(body, "faqBlock")
      .map((block, i) => ({ n: arrayLength(block.items), i }))
      .filter(({ n }) => n < 1)
      .map(({ i }) => `FAQ block ${i + 1} has no questions`),
  );
}

function checkTableShape(body: unknown[]): true | string {
  const found: string[] = [];

  blocksOf(body, "comparisonTable").forEach((block, i) => {
    const label = `comparison table ${i + 1}`;
    const columns = Array.isArray(block.columns) ? block.columns : [];
    const rows = Array.isArray(block.rows) ? block.rows : [];

    if (columns.length < 2 || columns.length > 4) {
      found.push(
        `${label} has ${plural(columns.length, "column")} — 2 to 4 is the range that stays readable on a phone`,
      );
    }
    if (rows.length < 1) {
      found.push(`${label} has no rows`);
    }

    rows.forEach((row, r) => {
      const cells = arrayLength((row as AnyBlock)?.cells);
      if (columns.length && cells !== columns.length) {
        found.push(
          `${label} row ${r + 1} has ${plural(cells, "cell")} but ${plural(columns.length, "column")}`,
        );
      }
    });
  });

  return problems(found);
}

function checkStatSourceUrl(body: unknown[]): true | string {
  return problems(
    blocksOf(body, "sourcedStat")
      .map((block, i) => ({ block, i }))
      .filter(({ block }) => isBlank(block.sourceUrl) || isBlank(block.sourceLabel))
      .map(
        ({ block, i }) =>
          `sourced statistic ${i + 1} ("${String(block.value ?? "")}") has no source — a number without one is exactly what this block exists to prevent`,
      ),
  );
}

/* The one that motivated exporting SERVICE_SLUGS. options.list in the schema
 * populates a dropdown; it does not validate. A slug typed by a script saves
 * cleanly and renders a card pointing nowhere. */
function checkServiceSlugs(body: unknown[]): true | string {
  return problems(
    blocksOf(body, "serviceLink")
      .filter((block) => !isServiceSlug(block.serviceSlug))
      .map(
        (block) =>
          `service link points at "${String(block.serviceSlug ?? "")}", which is not a service. One of: ${SERVICE_SLUGS.join(", ")}`,
      ),
  );
}

function checkFigureAlt(body: unknown[]): true | string {
  return problems(
    blocksOf(body, "figure")
      .map((block, i) => ({ block, i }))
      .filter(({ block }) => isBlank(block.alt))
      .map(({ i }) => `image ${i + 1} has no alt text`),
  );
}

const styleOf = (block: AnyBlock): string =>
  block._type === "block" && typeof block.style === "string" ? block.style : "";

function checkHeadingLevels(body: unknown[]): true | string {
  const blocks = body.filter(
    (b): b is AnyBlock => Boolean(b) && typeof b === "object",
  );
  const h1s = blocks.filter((b) => styleOf(b) === "h1").length;
  return h1s
    ? `${h1s} H1 heading${h1s === 1 ? "" : "s"} in the body — the post title is the only H1 on the page`
    : true;
}

function checkHeadingOrder(body: unknown[]): true | string {
  const blocks = body.filter(
    (b): b is AnyBlock => Boolean(b) && typeof b === "object",
  );
  let seenH2 = false;
  for (const block of blocks) {
    const style = styleOf(block);
    if (style === "h2") seenH2 = true;
    if (style === "h3" && !seenH2) {
      return "an H3 appears before the first H2 — a subheading with nothing to sit under";
    }
  }
  return true;
}

/* ------------------------------------------------------------------- the run */

export function validatePost(
  post: ValidatablePost,
  options: ValidateOptions = {},
): CheckResult[] {
  const skip = new Set<CheckId>(options.skip ?? []);
  const body = Array.isArray(post.body) ? post.body : [];
  const bodyJson = JSON.stringify(body);
  const shortAnswerWords = words(post.shortAnswer ?? "");
  const faqProse = (post.faqs ?? [])
    .map((faq) => `${faq.question}\n${faq.answer}`)
    .join("\n");

  const all: Omit<CheckResult, "skipped">[] = [
    /* title */
    { id: "title.banned", name: "title: banned words", severity: "error", field: "title", result: noBannedWords(post.title) },
    {
      id: "title.length",
      name: "title: <= 90 characters",
      severity: "error",
      field: "title",
      result: post.title.length <= 90 || `${post.title.length} characters`,
    },
    { id: "title.tired", name: "title: tired phrases", severity: "warning", field: "title", result: noTiredPhrases(post.title) },

    /* excerpt */
    { id: "excerpt.banned", name: "excerpt: banned words", severity: "error", field: "excerpt", result: noBannedWords(post.excerpt) },
    {
      id: "excerpt.length",
      name: "excerpt: <= 160 characters",
      severity: "error",
      field: "excerpt",
      result: post.excerpt.length <= 160 || `${post.excerpt.length} characters`,
    },
    { id: "excerpt.tired", name: "excerpt: tired phrases", severity: "warning", field: "excerpt", result: noTiredPhrases(post.excerpt) },

    /* short answer */
    { id: "shortAnswer.banned", name: "short answer: banned words", severity: "error", field: "shortAnswer", result: noBannedWords(post.shortAnswer) },
    {
      id: "shortAnswer.words",
      name: "short answer: 40-60 words (30-80 allowed)",
      severity: "error",
      field: "shortAnswer",
      result:
        shortAnswerWords >= 30 && shortAnswerWords <= 80
          ? true
          : shortAnswerWords < 30
            ? `${shortAnswerWords} words — too short to answer the question, aim for 40–60`
            : `${shortAnswerWords} words — too long to be lifted as an answer, aim for 40–60`,
    },
    { id: "shortAnswer.tired", name: "short answer: tired phrases", severity: "warning", field: "shortAnswer", result: noTiredPhrases(post.shortAnswer) },

    /* body — prose */
    { id: "body.banned", name: "body: banned words", severity: "error", field: "body", result: bodyHasNoBannedWords(body) },
    { id: "body.serviceLink", name: "body: links a service page", severity: "error", field: "body", result: bodyLinksAService(body) },
    {
      id: "body.template",
      name: "body: template scaffolding removed",
      severity: "error",
      field: "body",
      result: bodyJson.includes(TEMPLATE_MARKER)
        ? "the template instructions are still in the body"
        : true,
    },
    { id: "body.tired", name: "body: tired phrases", severity: "warning", field: "body", result: bodyHasNoTiredPhrases(body) },
    { id: "body.length", name: "body: 800-1500 words", severity: "warning", field: "body", result: bodyLengthWarning(body) },
    {
      id: "body.contactCta",
      name: "closing CTA is in the body",
      severity: "warning",
      field: "body",
      /* The CTA card is page chrome and never reaches the markdown export, the
       * feeds or llms-full.txt — so a reader who arrives through any of those
       * gets the argument and no next step. */
      result: bodyJson.includes("/contact")
        ? true
        : "no /contact link in the body — the feeds and markdown export will have no CTA",
    },

    /* body — block shape. Not enforced anywhere before this file. */
    { id: "body.stepsMin", name: "body: steps blocks have 2+ steps", severity: "error", field: "body", result: checkStepsMin(body) },
    { id: "body.faqMin", name: "body: FAQ blocks have a question", severity: "error", field: "body", result: checkFaqMin(body) },
    { id: "body.tableShape", name: "body: comparison tables are well formed", severity: "error", field: "body", result: checkTableShape(body) },
    { id: "body.statSourceUrl", name: "body: sourced statistics carry a source", severity: "error", field: "body", result: checkStatSourceUrl(body) },
    { id: "body.serviceSlugValid", name: "body: service links point at a real service", severity: "error", field: "body", result: checkServiceSlugs(body) },
    { id: "body.headingLevels", name: "body: no H1 in the body", severity: "error", field: "body", result: checkHeadingLevels(body) },
    { id: "body.figureAlt", name: "body: images have alt text", severity: "warning", field: "body", result: checkFigureAlt(body) },
    { id: "body.headingOrder", name: "body: headings nest in order", severity: "warning", field: "body", result: checkHeadingOrder(body) },

    /* the rest of the document */
    {
      id: "keyTakeaways.max",
      name: "key takeaways: at most 5",
      severity: "error",
      field: "keyTakeaways",
      result: post.keyTakeaways.length <= 5 || `${post.keyTakeaways.length}`,
    },
    {
      id: "keyTakeaways.banned",
      name: "key takeaways: banned words",
      severity: "error",
      field: "keyTakeaways",
      result: noBannedWords(post.keyTakeaways.join("\n")),
    },
    {
      id: "faqs.banned",
      name: "closing FAQ: banned words",
      severity: "error",
      field: "keyTakeaways",
      result: noBannedWords(faqProse),
    },
    {
      id: "faqs.tired",
      name: "closing FAQ: tired phrases",
      severity: "warning",
      field: "keyTakeaways",
      result: noTiredPhrases(faqProse),
    },
    { id: "topic.set", name: "topic set", severity: "error", field: "topic", result: post.hasTopic || "no topic" },
    { id: "author.set", name: "author set", severity: "error", field: "author", result: post.hasAuthor || "no author" },
    {
      id: "cover.alt",
      name: "cover has alt text",
      severity: "error",
      field: "cover",
      result: !post.hasCover || !isBlank(post.coverAlt) || "cover has no alt text",
    },
    {
      id: "cover.present",
      name: "cover image set",
      severity: "warning",
      field: "cover",
      /* A warning, not an error. Making cover required() in the schema would
       * immediately block the three posts seed.ts deliberately pushes without
       * one — there is no honest way for a script to invent a photograph. */
      result: post.hasCover || "no cover image — a human needs to upload one before publishing",
    },
    {
      id: "originality.recorded",
      name: "originality check recorded",
      severity: "error",
      field: "checks",
      result:
        !isBlank(post.originalityCheckedWith) && !isBlank(post.originalityCheckedAt)
          ? true
          : "no originality check recorded — a person has to run it and say what they used",
    },
    {
      id: "originality.notFuture",
      name: "originality check is not dated in the future",
      severity: "error",
      field: "checks",
      result: (() => {
        if (isBlank(post.originalityCheckedAt)) return true;
        const at = Date.parse(post.originalityCheckedAt as string);
        if (Number.isNaN(at)) return "that date cannot be read";
        return at > Date.now() + 86_400_000 ? "that date is in the future" : true;
      })(),
    },
    {
      id: "publishedAt.set",
      name: "publish date set",
      severity: "error",
      field: "meta",
      result: !isBlank(post.publishedAt) || "no publish date",
    },
  ];

  return all.map((check) =>
    skip.has(check.id) ? { ...check, result: true as const, skipped: true as const } : check,
  );
}

export function summarise(results: CheckResult[]): {
  errors: CheckResult[];
  warnings: CheckResult[];
  skipped: CheckResult[];
  ok: boolean;
} {
  const failed = results.filter((r) => !r.skipped && r.result !== true);
  const errors = failed.filter((r) => r.severity === "error");
  const warnings = failed.filter((r) => r.severity === "warning");
  const skipped = results.filter((r) => r.skipped);
  return { errors, warnings, skipped, ok: errors.length === 0 };
}

/* ---------------------------------------------------------------- adapters */

/** The app's own Post, as used by content/ and by every rendered page. It has
 *  no originality fields — those exist only in Sanity — so callers pass those
 *  ids in `skip` rather than getting a false pass. */
export function fromPost(post: Post): ValidatablePost {
  return {
    title: post.title,
    excerpt: post.excerpt,
    shortAnswer: post.shortAnswer,
    keyTakeaways: post.keyTakeaways,
    body: post.body,
    faqs: post.faqs ?? [],
    hasTopic: Boolean(post.topic),
    hasAuthor: Boolean(post.author),
    hasCover: Boolean(post.cover),
    coverAlt: post.cover?.alt ?? "",
    originalityCheckedWith: null,
    originalityCheckedAt: null,
    publishedAt: post.publishedAt,
  };
}

/** A raw Sanity document — what the Studio's validation rule and the push CLI
 *  both hold. `cover` is a cloudinary.asset, so presence is public_id, not the
 *  object: the object exists as soon as any sub-field is touched. */
export function fromSanityDoc(doc: Record<string, unknown>): ValidatablePost {
  const str = (value: unknown): string => (typeof value === "string" ? value : "");
  const strOrNull = (value: unknown): string | null =>
    typeof value === "string" && value.trim() ? value : null;
  const cover = doc.cover as { public_id?: unknown } | undefined;

  return {
    title: str(doc.title),
    excerpt: str(doc.excerpt),
    shortAnswer: str(doc.shortAnswer),
    keyTakeaways: Array.isArray(doc.keyTakeaways)
      ? doc.keyTakeaways.filter((t): t is string => typeof t === "string")
      : [],
    body: Array.isArray(doc.body) ? doc.body : [],
    faqs: Array.isArray(doc.faqs)
      ? (doc.faqs as { question?: unknown; answer?: unknown }[]).map((faq) => ({
          question: str(faq?.question),
          answer: str(faq?.answer),
        }))
      : [],
    hasTopic: Boolean(doc.topic),
    hasAuthor: Boolean(doc.author),
    hasCover: Boolean(cover?.public_id),
    coverAlt: str(doc.coverAlt),
    originalityCheckedWith: strOrNull(doc.originalityCheckedWith),
    originalityCheckedAt: strOrNull(doc.originalityCheckedAt),
    publishedAt: strOrNull(doc.publishedAt),
  };
}
