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

/** Words that start with a banned stem but are not the banned word. A blog
 *  about AI writes "transformer"; a building has an "elevator". */
const STEM_EXCEPTIONS = new Set([
  "transformer",
  "transformers",
  "elevator",
  "elevators",
]);

/* SUFFIX matching, not exact matching: `\b<term>\w*\b` catches "transforming",
 * "empowerment" and "unlocked" as well as the bare stem. That is deliberate and
 * it is what the guidelines ask for — content-guidelines.md §Banned words bans
 * them "in any form". STEM_EXCEPTIONS carves out the handful of unrelated words
 * that share a stem. Multi-word phrases fall back to a plain substring test.
 *
 * Returns the MATCHED SUBSTRINGS, not the stems, because the caller shows them
 * to a person: `Banned word: "transforming"` sends them to the right word,
 * `Banned word: transform` sends them hunting. */
function findMatches(text: string, list: string[]): string[] {
  const haystack = text.toLowerCase();
  const hits = new Set<string>();

  for (const term of list) {
    if (term.includes(" ") || term.includes("-")) {
      if (haystack.includes(term)) hits.add(term);
      continue;
    }
    for (const match of haystack.matchAll(new RegExp(`\\b${term}\\w*\\b`, "gi"))) {
      if (!STEM_EXCEPTIONS.has(match[0])) hits.add(match[0]);
    }
  }

  return [...hits];
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

/* Keys whose string values are identifiers, structure or machine data rather
 * than authored prose. Everything else in the tree IS prose and gets checked.
 *
 * A deny-list, not an allow-list, and the distinction matters. This function
 * used to read a fixed list of keys off each block — which meant every word
 * inside faqBlock.items[], stepsBlock.steps[] and comparisonTable.rows[].cells
 * was invisible to both the Studio and `npm run check-content`. An allow-list
 * fails SILENTLY: add a block type with a new prose field and the checks quietly
 * stop covering it. A deny-list fails LOUDLY — a false positive on some URL —
 * and is fixed by adding one key here.
 *
 * Note what is NOT denied: `alt`. Alt text is prose a screen-reader user hears,
 * and it is held to the same standard as anything else on the page. */
const NON_PROSE_KEYS = new Set([
  /* Document and array metadata. */
  "_type",
  "_key",
  "_ref",
  "_id",
  "_rev",
  "_createdAt",
  "_updatedAt",
  /* Portable-text structure. Without these, values like "normal", "h2",
   * "bullet" and "note" would be scanned as prose and counted as words. */
  "style",
  "listItem",
  "marks",
  "tone",
  /* Identifiers and URLs. */
  "href",
  "url",
  "sourceUrl",
  "serviceSlug",
  /* A code sample is not prose — a CSS example containing
   * `transform: translateY(...)` must not make a post unpublishable. */
  "language",
  "code",
  /* The Cloudinary asset object is entirely machine data (public_id,
   * secure_url, original_filename, format). Its alt text is a SIBLING field
   * and is still checked. */
  "asset",
]);

function collectText(node: unknown, out: string[]): void {
  if (typeof node === "string") {
    out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectText(item, out);
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (NON_PROSE_KEYS.has(key)) continue;
      collectText(value, out);
    }
  }
}

/* Flattens a body to prose so the same checks can run over it. The walker picks
 * up block.children[].text for free, so there is no special case for text
 * blocks any more — one traversal covers every block type, including ones added
 * later. */
function bodyText(blocks: Block[] | undefined): string {
  if (!Array.isArray(blocks)) return "";
  const out: string[] = [];
  collectText(blocks, out);
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
