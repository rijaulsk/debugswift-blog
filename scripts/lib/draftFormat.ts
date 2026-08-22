/* The drafts/<slug>.md format: parsing only, no Sanity knowledge.
 *
 * WHAT THIS FORMAT IS FOR. It is the one shape a person, Claude Code and
 * Antigravity can all produce for the same pipeline. Once
 * NEXT_PUBLIC_SANITY_PROJECT_ID is set, writing a file into content/ publishes
 * nothing — Sanity is the only source of truth — so a draft file is a
 * SUBMISSION that scripts/push.ts converts and writes, never a mirror of what
 * is live. After a push, the Studio is authoritative.
 *
 * TWO DESIGN RULES, both about making a model produce this reliably.
 *
 * 1. Frontmatter is SCALARS ONLY, and no YAML library. The grammar is
 *    `key: value`, one per line, everything after the first colon taken as a
 *    literal string. seed.ts hand-rolls its .env.local reader for the same
 *    reason and the repo bans dependencies that have not argued for
 *    themselves — but the real argument is that YAML's type coercion is
 *    actively dangerous here. `shortAnswer: no` parses as boolean false. A
 *    date becomes a Date, not the string the datetime field wants. A title
 *    containing ": " breaks the document. Models get all three wrong
 *    constantly. Nesting is refused too, so faqs/sources/keyTakeaways cannot
 *    migrate into the header and give the file two content zones.
 *
 * 2. Structured content is a FENCE tagged ds-<name>, and the rule is total:
 *    every DebugSwift block is a fence tagged ds-<name>; every other fence is a
 *    code block whose language is its tag. There is no "unknown fence" error,
 *    and ```ts produces a codeBlock for free. Fences beat ::: directives
 *    because ``` is the commonest structural token in a model's markdown
 *    vocabulary, because a fence has a distinct terminator (a missed :::
 *    closer swallows the rest of the document and reports the error hundreds
 *    of lines away), and because a model stops trying to format the contents
 *    of a fence.
 *
 * Do not reach for remark/unified/gray-matter. This grammar is four inline
 * marks and eight block types; those bring ~30 transitive dependencies to parse
 * something a hundred and fifty lines of code parses exactly.
 */

export class DraftParseError extends Error {
  readonly line: number;
  readonly file: string;

  constructor(message: string, line: number, file: string) {
    super(message);
    this.name = "DraftParseError";
    this.line = line;
    this.file = file;
  }

  /** `drafts/x.md:14  message` — the form an editor can jump to. */
  toString(): string {
    return `${this.file}:${this.line}  ${this.message}`;
  }
}

export type Chunk =
  | { kind: "markdown"; text: string; line: number }
  | { kind: "fence"; tag: string; body: string; line: number };

export type DraftFaq = { question: string; answer: string };
export type DraftSource = { label: string; url: string };

export type ParsedDraft = {
  frontmatter: Record<string, string>;
  /** Body content in document order, with field fences already lifted out. */
  chunks: Chunk[];
  fields: {
    shortAnswer: string | null;
    keyTakeaways: string[] | null;
    faqs: DraftFaq[] | null;
    sources: DraftSource[] | null;
    originalityNotes: string | null;
  };
  /** ds-note bodies. Printed by the CLI, never published. */
  notes: string[];
  warnings: { line: number; message: string }[];
};

/* Fences that carry a document FIELD rather than a body block. Lifted out of
 * the chunk stream entirely.
 *
 * ds-closing-faq is deliberately not "ds-faqs": a pair of tags differing only
 * by a trailing s is a trap a model falls into, and the two mean different
 * things — ds-faq is a block inside the body, this is the closing FAQ field. */
const FIELD_FENCES = new Set([
  "ds-short-answer",
  "ds-takeaways",
  "ds-closing-faq",
  "ds-sources",
  "ds-originality-notes",
]);

/* Keys the parser refuses outright, with the reason.
 *
 * The originality fields are required to publish, and WRITING-GUIDE.md §3
 * defines the check as running a plagiarism tool and exact-phrase searching the
 * ten most distinctive sentences. A model asserting in frontmatter that it did
 * those things is the invented-proof failure the honesty rules exist to stop —
 * and schemaTypes/post.ts already says so in as many words.
 *
 * Rejecting rather than ignoring is the point: silently dropping the keys
 * teaches an agent that writing them is harmless, and the next model reads this
 * file as an example. */
const REFUSED_KEYS: Record<string, string> = {
  originalityCheckedWith:
    "the originality check is a human step — `npm run push` never writes it. Put what you would suggest checking in a ```ds-originality-notes fence instead.",
  originalityCheckedAt:
    "the originality check is a human step — `npm run push` never writes it. Put what you would suggest checking in a ```ds-originality-notes fence instead.",
};

const KNOWN_KEYS = new Set([
  "title",
  "slug",
  "excerpt",
  "topic",
  "author",
  "publishedAt",
  "updatedAt",
  "cover",
  "coverAlt",
  "seoTitle",
  "seoDescription",
  "noindex",
]);

const FRONTMATTER_DELIMITER = "---";

/** The one place a frontmatter value is not taken literally. */
export const isTruthy = (value: string): boolean =>
  ["true", "yes", "1"].includes(value.trim().toLowerCase());

function parseFrontmatter(
  lines: string[],
  file: string,
): { frontmatter: Record<string, string>; bodyStart: number } {
  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
    throw new DraftParseError(
      `the file must open with "${FRONTMATTER_DELIMITER}" and a frontmatter block`,
      1,
      file,
    );
  }

  const frontmatter: Record<string, string> = {};
  let i = 1;

  for (; i < lines.length; i += 1) {
    const raw = lines[i];
    if (raw.trim() === FRONTMATTER_DELIMITER) {
      return { frontmatter, bodyStart: i + 1 };
    }

    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const colon = line.indexOf(":");
    if (colon === -1) {
      throw new DraftParseError(
        `"${line}" is not a "key: value" pair. Frontmatter holds one scalar per line; anything structured belongs in a ds- fence below.`,
        i + 1,
        file,
      );
    }

    const key = line.slice(0, colon).trim();
    /* Everything after the FIRST colon, verbatim. A title containing ": " is
     * ordinary English and must survive. */
    const value = line.slice(colon + 1).trim();

    if (REFUSED_KEYS[key]) {
      throw new DraftParseError(`"${key}" cannot be set from a draft file — ${REFUSED_KEYS[key]}`, i + 1, file);
    }
    if (key in frontmatter) {
      throw new DraftParseError(`"${key}" appears twice`, i + 1, file);
    }

    frontmatter[key] = value;
  }

  throw new DraftParseError(
    `the frontmatter block is never closed — add a line containing only "${FRONTMATTER_DELIMITER}"`,
    lines.length,
    file,
  );
}

const FENCE = /^(\s*)(`{3,})\s*([^\s`]*)\s*$/;

/** Split the body into markdown runs and fenced blocks, in document order. */
function parseChunks(lines: string[], bodyStart: number, file: string): Chunk[] {
  const chunks: Chunk[] = [];
  let markdown: string[] = [];
  let markdownLine = bodyStart + 1;

  const flushMarkdown = () => {
    if (markdown.join("").trim()) {
      chunks.push({ kind: "markdown", text: markdown.join("\n"), line: markdownLine });
    }
    markdown = [];
  };

  for (let i = bodyStart; i < lines.length; i += 1) {
    const open = FENCE.exec(lines[i]);

    if (!open) {
      if (!markdown.length) markdownLine = i + 1;
      markdown.push(lines[i]);
      continue;
    }

    flushMarkdown();

    const ticks = open[2];
    const tag = open[3];
    const openedAt = i + 1;
    const body: string[] = [];
    let closed = false;

    for (i += 1; i < lines.length; i += 1) {
      const close = FENCE.exec(lines[i]);
      /* Closed by a fence of at least the same length and no tag — the usual
       * markdown rule. A longer opener lets a ds- fence contain a ``` sample. */
      if (close && close[2].length >= ticks.length && !close[3]) {
        closed = true;
        break;
      }
      body.push(lines[i]);
    }

    if (!closed) {
      throw new DraftParseError(
        `the \`\`\`${tag || "code"} block opened here is never closed`,
        openedAt,
        file,
      );
    }

    chunks.push({ kind: "fence", tag, body: body.join("\n"), line: openedAt });
    markdownLine = i + 2;
  }

  flushMarkdown();
  return chunks;
}

const parseJsonFence = <T,>(chunk: Chunk & { kind: "fence" }, file: string): T => {
  try {
    return JSON.parse(chunk.body) as T;
  } catch (error) {
    throw new DraftParseError(
      `\`\`\`${chunk.tag} does not contain valid JSON — ${(error as Error).message}`,
      chunk.line,
      file,
    );
  }
};

const requireArray = (value: unknown, chunk: Chunk & { kind: "fence" }, file: string) => {
  if (!Array.isArray(value)) {
    throw new DraftParseError(`\`\`\`${chunk.tag} must contain a JSON array`, chunk.line, file);
  }
  return value as unknown[];
};

export function parseDraft(source: string, file: string): ParsedDraft {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const { frontmatter, bodyStart } = parseFrontmatter(lines, file);
  const all = parseChunks(lines, bodyStart, file);

  const warnings: { line: number; message: string }[] = [];
  const notes: string[] = [];
  const chunks: Chunk[] = [];
  const fields: ParsedDraft["fields"] = {
    shortAnswer: null,
    keyTakeaways: null,
    faqs: null,
    sources: null,
    originalityNotes: null,
  };
  const seen = new Set<string>();

  for (const key of Object.keys(frontmatter)) {
    if (!KNOWN_KEYS.has(key)) {
      warnings.push({
        line: 1,
        message: `frontmatter key "${key}" is not one this pipeline writes — it will be ignored`,
      });
    }
  }

  for (const chunk of all) {
    if (chunk.kind !== "fence" || !FIELD_FENCES.has(chunk.tag)) {
      if (chunk.kind === "fence" && chunk.tag === "ds-note") {
        notes.push(chunk.body.trim());
        continue;
      }
      chunks.push(chunk);
      continue;
    }

    if (seen.has(chunk.tag)) {
      throw new DraftParseError(`\`\`\`${chunk.tag} appears twice`, chunk.line, file);
    }
    seen.add(chunk.tag);

    switch (chunk.tag) {
      case "ds-short-answer":
        fields.shortAnswer = chunk.body.trim().replace(/\s*\n\s*/g, " ");
        break;

      case "ds-originality-notes":
        fields.originalityNotes = chunk.body.trim();
        break;

      case "ds-takeaways":
        fields.keyTakeaways = chunk.body
          .split("\n")
          /* Tolerate a bullet marker even though the format does not ask for
           * one. A model will add "- " out of habit and the intent is obvious. */
          .map((line) => line.trim().replace(/^[-*]\s+/, ""))
          .filter(Boolean);
        break;

      case "ds-closing-faq": {
        const items = requireArray(parseJsonFence<unknown>(chunk, file), chunk, file);
        fields.faqs = items.map((item, i) => {
          const faq = item as Partial<DraftFaq>;
          if (!faq?.question?.trim() || !faq?.answer?.trim()) {
            throw new DraftParseError(
              `\`\`\`ds-closing-faq item ${i + 1} needs both "question" and "answer"`,
              chunk.line,
              file,
            );
          }
          return { question: faq.question.trim(), answer: faq.answer.trim() };
        });
        break;
      }

      case "ds-sources": {
        const items = requireArray(parseJsonFence<unknown>(chunk, file), chunk, file);
        fields.sources = items.map((item, i) => {
          const src = item as Partial<DraftSource>;
          if (!src?.label?.trim() || !src?.url?.trim()) {
            throw new DraftParseError(
              `\`\`\`ds-sources item ${i + 1} needs both "label" and "url"`,
              chunk.line,
              file,
            );
          }
          return { label: src.label.trim(), url: src.url.trim() };
        });
        break;
      }
    }
  }

  /* Convention, warned rather than enforced: the answer-engine fields read
   * better at the top and the reference material at the bottom, but a file that
   * puts them elsewhere is still a valid file. */
  if (!fields.shortAnswer) {
    warnings.push({ line: 1, message: "no ```ds-short-answer fence — the post cannot publish without one" });
  }

  return { frontmatter, chunks, fields, notes, warnings };
}
