import type { PortableTextBlock } from "@portabletext/types";

/* The house style, enforced where it can't be ignored.
 *
 * A style guide nobody reads is a style guide nobody follows, and posts written
 * with AI assistance drift toward exactly the vocabulary this brand bans —
 * "unlock", "seamless", "transform" are the default register of every model
 * writing marketing copy. So the rules live in the schema and fail validation
 * rather than living in a document and failing quietly.
 *
 * Source of truth for the list: debugswift-assets/content-guidelines.md in the
 * main repo (§Banned words). Keep the two in step. */

/** Hard bans — these fail validation. Straight from the guidelines. */
const BANNED = [
  "elevate",
  "empower",
  "unlock",
  "transform",
  "seamless",
  "leverage",
];

/** Softer offenders — a warning, because context occasionally justifies them. */
const DISCOURAGED = [
  "journey",
  "delight",
  "supercharge",
  "game-changer",
  "game changer",
  "cutting-edge",
  "cutting edge",
  "revolutionize",
  "revolutionise",
  "in today's fast-paced world",
  "in the world of",
  "dive into",
  "in conclusion",
  "it's important to note",
  "when it comes to",
];

/* Word-boundary matching so "leverage" is caught but "transformer" and
 * "delightfully" are not caught by accident — and so a ban on "transform" does
 * not fire on "transformation of a spreadsheet" without the author noticing
 * WHY. Multi-word phrases fall back to a plain substring test. */
function findMatches(text: string, list: string[]): string[] {
  const haystack = text.toLowerCase();
  return list.filter((term) => {
    if (term.includes(" ") || term.includes("-")) return haystack.includes(term);
    return new RegExp(`\\b${term}\\w*\\b`, "i").test(haystack);
  });
}

/** Validation for a plain string field. Returns true or an error message. */
export function noBannedWords(value: unknown): true | string {
  if (typeof value !== "string" || !value) return true;
  const hits = findMatches(value, BANNED);
  if (hits.length) {
    return `Banned word${hits.length > 1 ? "s" : ""}: ${hits.join(", ")}. See the content guidelines — rewrite in plain owner's language.`;
  }
  return true;
}

/** Softer check, wired as a warning rather than an error. */
export function noTiredPhrases(value: unknown): true | string {
  if (typeof value !== "string" || !value) return true;
  const hits = findMatches(value, DISCOURAGED);
  if (hits.length) {
    return `Reads like filler: ${hits.join(", ")}. Cut or rephrase unless it genuinely earns its place.`;
  }
  return true;
}

type Block = PortableTextBlock | (Record<string, unknown> & { _type: string });

/* Flattens a body to prose so the same checks can run over it. Deliberately
 * simple — it only needs the words, not the structure. */
function bodyText(blocks: Block[] | undefined): string {
  if (!Array.isArray(blocks)) return "";
  const out: string[] = [];
  for (const block of blocks) {
    if (block._type === "block") {
      const children = (block as PortableTextBlock).children ?? [];
      out.push(
        children
          .map((c) => (typeof (c as { text?: string }).text === "string" ? (c as { text: string }).text : ""))
          .join(""),
      );
      continue;
    }
    const b = block as Record<string, unknown>;
    for (const key of ["title", "text", "blurb", "caption", "label"]) {
      if (typeof b[key] === "string") out.push(b[key] as string);
    }
  }
  return out.join("\n");
}

export function bodyHasNoBannedWords(value: unknown): true | string {
  return noBannedWords(bodyText(value as Block[] | undefined));
}

export function bodyHasNoTiredPhrases(value: unknown): true | string {
  return noTiredPhrases(bodyText(value as Block[] | undefined));
}

/**
 * Word count for the body, as a warning rather than an error.
 *
 * 800–1,500 is the guideline. A warning, not a hard fail: an occasional short
 * piece that says one thing properly is fine, and a validation rule that blocks
 * publishing over a word count would eventually be worked around rather than
 * respected.
 */
export function bodyLengthWarning(value: unknown): true | string {
  const words = bodyText(value as Block[] | undefined)
    .split(/\s+/)
    .filter(Boolean).length;
  if (words === 0) return true;
  if (words < 800) return `${words} words — the guideline is 800–1,500. Is there more to say?`;
  if (words > 1500) return `${words} words — over the 1,500 guideline. Is this two posts?`;
  return true;
}

/**
 * Every post must link at least one service page.
 *
 * This is the services ↔ blog ↔ tools triangle from the content guidelines, and
 * it is the only reason the blog earns its keep commercially. A post that sends
 * nobody anywhere is a nice article on someone else's website.
 *
 * Satisfied by a serviceLink block OR a plain link into /services or
 * /lead-engine, because forcing the card on every post would make the pattern
 * obvious and tiresome.
 */
export function bodyLinksAService(value: unknown): true | string {
  const blocks = (Array.isArray(value) ? value : []) as Block[];

  for (const block of blocks) {
    if (block._type === "serviceLink") return true;
    if (block._type === "block") {
      const defs = ((block as PortableTextBlock).markDefs ?? []) as {
        _type?: string;
        href?: string;
      }[];
      if (
        defs.some(
          (d) =>
            d._type === "link" &&
            typeof d.href === "string" &&
            /debugswift\.com\/(services|lead-engine)/.test(d.href),
        )
      ) {
        return true;
      }
    }
  }

  return "No service link. Every post links at least one service page or the Lead Engine — add a Service link block, or link one inline.";
}
