import {
  bullets,
  callout,
  code,
  faqBlock,
  figure,
  numbered,
  quote,
  serviceLink,
  sourcedStat,
  steps,
  table,
  textBlock,
} from "@/content/helpers";
import type { BodyBlock } from "@/lib/types";
import type { Chunk, ParsedDraft } from "@/scripts/lib/draftFormat";
import { DraftParseError } from "@/scripts/lib/draftFormat";

/* A parsed draft file -> the Portable Text a post's body is made of.
 *
 * Everything here is built with content/helpers.ts, which already emits the
 * exact wire shape Sanity returns — same _type, same _key, same markDefs. That
 * is why scripts/seed.ts can push those objects straight into the dataset, and
 * it is why this converter reuses them rather than growing a second
 * implementation of the inline syntax.
 *
 * NOT TO BE MERGED WITH textToBlocks() in sanity/actions/createPostFromDraft.ts.
 * They look like the same function and they are not. That one serves the
 * UNTRUSTED public path: a stranger submits through /api/draft, and its
 * hard-coded `markDefs: []` is the guarantee that they cannot inject an
 * outbound link into this domain. This one serves the TRUSTED local path, where
 * the operator owns the repo and a service link is a publish requirement. Same
 * shape, opposite trust model.
 */

/** The fence tag -> block type table. Everything not here is a code sample. */
const DS_TAGS = [
  "ds-callout",
  "ds-faq",
  "ds-steps",
  "ds-table",
  "ds-service",
  "ds-stat",
  "ds-figure",
] as const;

export type FigureRef = {
  /** Index into the returned body, so the CLI can patch the real asset in. */
  index: number;
  publicId: string;
};

export type ConvertedDraft = {
  body: BodyBlock[];
  /** Cloudinary public_ids referenced by ds-figure blocks. scripts/push.ts
   *  resolves these against the Admin API; nothing here invents dimensions. */
  figureRefs: FigureRef[];
  warnings: { line: number; message: string }[];
};

type Fence = Chunk & { kind: "fence" };

const json = <T,>(chunk: Fence, file: string): T => {
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

const need = (value: unknown, what: string, chunk: Fence, file: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new DraftParseError(`\`\`\`${chunk.tag} needs "${what}"`, chunk.line, file);
  }
  return value.trim();
};

/* ------------------------------------------------------------------ markdown */

const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^[-*]\s+(.*)$/;
const NUMBERED = /^\d+[.)]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;

/**
 * A markdown run -> text blocks.
 *
 * Paragraphs are separated by a blank line; a heading, list item or quote ends
 * the paragraph it interrupts. Lists are flat: content/helpers.ts hardcodes
 * level 1, and the schema offers no nesting, so an indented list item is
 * flattened with a warning rather than silently reshaped.
 */
type PendingKind = "normal" | "bullet" | "number" | "quote";

function markdownToBlocks(
  chunk: Chunk & { kind: "markdown" },
  warnings: { line: number; message: string }[],
): BodyBlock[] {
  const out: BodyBlock[] = [];
  const lines = chunk.text.split("\n");

  /* One pending run at a time, so a WRAPPED line continues whatever it is
   * inside rather than starting a new block. This matters more than it looks:
   * hand-written markdown wraps list items constantly, and treating the second
   * line as a fresh paragraph silently splits one bullet into a bullet plus a
   * dangling sentence. A blank line, a heading, a fence or a new marker ends
   * the run; anything else continues it. */
  /* State in one object rather than two locals: the helpers below mutate it,
   * and TypeScript cannot follow that through a closure — it narrows a plain
   * `let kind` to whichever literal it last saw assigned inline and then calls
   * the quote comparison unreachable. */
  const run: { kind: PendingKind; lines: string[] } = { kind: "normal", lines: [] };

  const flush = () => {
    const text = run.lines.join(" ").replace(/\s+/g, " ").trim();
    const kind = run.kind;
    run.lines = [];
    run.kind = "normal";
    if (!text) return;

    if (kind === "bullet") out.push(...(bullets([text]) as BodyBlock[]));
    else if (kind === "number") out.push(...(numbered([text]) as BodyBlock[]));
    else if (kind === "quote") out.push(quote(text) as BodyBlock);
    else out.push(textBlock("normal", text) as BodyBlock);
  };

  const start = (next: PendingKind, text: string) => {
    flush();
    run.kind = next;
    run.lines = [text];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trim();
    const lineNumber = chunk.line + i;

    if (!line) {
      flush();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      const depth = heading[1].length;
      if (depth === 1) {
        warnings.push({
          line: lineNumber,
          message: "an H1 in the body was demoted to H2 — the post title is the only H1 on the page",
        });
      }
      if (depth > 3) {
        warnings.push({
          line: lineNumber,
          message: `an H${depth} was demoted to H3 — a post that needs H4 is two posts`,
        });
      }
      out.push(textBlock(depth <= 2 ? "h2" : "h3", heading[2].trim()) as BodyBlock);
      continue;
    }

    const bullet = BULLET.exec(line);
    const numberedItem = bullet ? null : NUMBERED.exec(line);

    if (bullet || numberedItem) {
      /* An indented marker is a nested list. The schema has one level and
       * content/helpers.ts hardcodes it, so flatten and say so. */
      if (/^\s+/.test(raw)) {
        warnings.push({
          line: lineNumber,
          message: "nested list item flattened — the body schema has one list level",
        });
      }
      start(bullet ? "bullet" : "number", (bullet ?? numberedItem)![1].trim());
      continue;
    }

    const quoted = QUOTE.exec(line);
    if (quoted) {
      /* Consecutive > lines are one quote, the usual markdown rule. */
      if (run.kind === "quote") run.lines.push(quoted[1].trim());
      else start("quote", quoted[1].trim());
      continue;
    }

    /* A plain line continues whatever run is open — bullet, number, quote or
     * paragraph — which is what makes a wrapped list item survive. */
    run.lines.push(line);
  }

  flush();
  return out;
}

/* -------------------------------------------------------------------- fences */

function fenceToBlock(
  chunk: Fence,
  file: string,
  figureRefs: FigureRef[],
  index: () => number,
): BodyBlock {
  switch (chunk.tag) {
    case "ds-callout": {
      const data = json<{ tone?: string; title?: string; text?: string }>(chunk, file);
      const tone = data.tone === "warning" ? "warning" : "note";
      return callout(data.title ?? "", need(data.text, "text", chunk, file), tone) as BodyBlock;
    }

    case "ds-faq": {
      const items = json<{ question?: string; answer?: string }[]>(chunk, file);
      if (!Array.isArray(items) || !items.length) {
        throw new DraftParseError("```ds-faq needs at least one question", chunk.line, file);
      }
      return faqBlock(
        items.map((item, i) => ({
          question: need(item.question, `items[${i}].question`, chunk, file),
          answer: need(item.answer, `items[${i}].answer`, chunk, file),
        })),
      ) as BodyBlock;
    }

    case "ds-steps": {
      const data = json<{ title?: string; steps?: { title?: string; text?: string }[] }>(
        chunk,
        file,
      );
      const list = Array.isArray(data.steps) ? data.steps : [];
      if (list.length < 2) {
        throw new DraftParseError(
          "```ds-steps needs at least 2 steps — HowTo structured data is not built from one",
          chunk.line,
          file,
        );
      }
      return steps(
        data.title ?? "",
        list.map((step, i) => ({
          title: need(step.title, `steps[${i}].title`, chunk, file),
          ...(step.text?.trim() ? { text: step.text.trim() } : {}),
        })),
      ) as BodyBlock;
    }

    case "ds-table": {
      const data = json<{ caption?: string; columns?: string[]; rows?: string[][] }>(chunk, file);
      const columns = Array.isArray(data.columns) ? data.columns : [];
      const rows = Array.isArray(data.rows) ? data.rows : [];
      if (columns.length < 2 || columns.length > 4) {
        throw new DraftParseError(
          `\`\`\`ds-table has ${columns.length} columns — 2 to 4 is the range that stays readable on a phone`,
          chunk.line,
          file,
        );
      }
      rows.forEach((row, i) => {
        if (!Array.isArray(row) || row.length !== columns.length) {
          throw new DraftParseError(
            `\`\`\`ds-table row ${i + 1} has ${Array.isArray(row) ? row.length : 0} cells but ${columns.length} columns`,
            chunk.line,
            file,
          );
        }
      });
      return table(data.caption ?? "", columns, rows) as BodyBlock;
    }

    case "ds-service": {
      const data = json<{ serviceSlug?: string; blurb?: string }>(chunk, file);
      return serviceLink(
        need(data.serviceSlug, "serviceSlug", chunk, file),
        need(data.blurb, "blurb", chunk, file),
      ) as BodyBlock;
    }

    case "ds-stat": {
      const data = json<{
        value?: string;
        label?: string;
        sourceLabel?: string;
        sourceUrl?: string;
      }>(chunk, file);
      return sourcedStat(
        need(data.value, "value", chunk, file),
        need(data.label, "label", chunk, file),
        need(data.sourceLabel, "sourceLabel", chunk, file),
        need(data.sourceUrl, "sourceUrl", chunk, file),
      ) as BodyBlock;
    }

    case "ds-figure": {
      const data = json<{ publicId?: string; alt?: string; caption?: string }>(chunk, file);
      const publicId = need(data.publicId, "publicId", chunk, file);
      figureRefs.push({ index: index(), publicId });
      return figure(
        publicId,
        need(data.alt, "alt", chunk, file),
        data.caption?.trim() || undefined,
      ) as BodyBlock;
    }

    default:
      /* The rule that makes the mapping total: anything not a ds- tag is a code
       * sample whose language is its tag. No unknown-fence error exists. */
      return code(chunk.tag || "text", chunk.body) as BodyBlock;
  }
}

export function convertDraft(draft: ParsedDraft, file: string): ConvertedDraft {
  const body: BodyBlock[] = [];
  const figureRefs: FigureRef[] = [];
  const warnings = [...draft.warnings];

  for (const chunk of draft.chunks) {
    if (chunk.kind === "markdown") {
      body.push(...markdownToBlocks(chunk, warnings));
      continue;
    }

    if (chunk.tag.startsWith("ds-") && !DS_TAGS.includes(chunk.tag as (typeof DS_TAGS)[number])) {
      throw new DraftParseError(
        `\`\`\`${chunk.tag} is not a block type. One of: ${DS_TAGS.join(", ")} — or drop the ds- prefix to make it a code sample.`,
        chunk.line,
        file,
      );
    }

    body.push(fenceToBlock(chunk, file, figureRefs, () => body.length));
  }

  return { body, figureRefs, warnings };
}
