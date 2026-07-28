import type { PortableTextBlock, PortableTextSpan } from "@portabletext/types";
import type { BodyBlock, FaqItem, Post } from "@/lib/types";
import { MAIN, siteUrl } from "@/lib/links";

/* Text-level operations on a post body.
 *
 * Everything here exists because the body has to be readable by things that are
 * not a browser: the table of contents, the markdown export at /md/<slug>, the
 * llms-full.txt corpus, the JSON-LD compilers, and the search index. Those all
 * need the SAME traversal, so it lives once, here, rather than four times.
 *
 * The block union is loosely typed (`Record<string, unknown>` for custom
 * blocks) on purpose — Sanity's generated types would couple this file to the
 * schema, and these functions must degrade gracefully when they meet a block
 * type they were not taught about rather than throwing mid-render. */

type Block = BodyBlock;

const isTextBlock = (b: Block): b is PortableTextBlock => b._type === "block";

function spansOf(block: PortableTextBlock): PortableTextSpan[] {
  return (block.children ?? []).filter(
    (c): c is PortableTextSpan => (c as { _type?: string })._type === "span",
  );
}

/** Flatten a body to plain prose. Custom blocks contribute their human text. */
export function toPlainText(blocks: Block[] = []): string {
  const out: string[] = [];

  for (const block of blocks) {
    if (isTextBlock(block)) {
      out.push(spansOf(block).map((s) => s.text).join(""));
      continue;
    }
    const b = block as Record<string, unknown>;
    switch (block._type) {
      case "calloutBlock":
        out.push([b.title, b.text].filter(Boolean).join(". "));
        break;
      case "faqBlock":
        for (const item of (b.items as FaqItem[] | undefined) ?? []) {
          out.push(`${item.question} ${item.answer}`);
        }
        break;
      case "stepsBlock":
        out.push(String(b.title ?? ""));
        for (const s of (b.steps as { title: string; text?: string }[] | undefined) ?? []) {
          out.push(`${s.title} ${s.text ?? ""}`);
        }
        break;
      case "comparisonTable": {
        out.push(String(b.caption ?? ""));
        const rows = (b.rows as { cells?: string[] }[] | undefined) ?? [];
        for (const row of rows) out.push((row.cells ?? []).join(" "));
        break;
      }
      case "serviceLink":
        out.push(String(b.blurb ?? ""));
        break;
      case "sourcedStat":
        out.push(`${b.value ?? ""} ${b.label ?? ""}`);
        break;
      case "figure":
        out.push(String(b.caption ?? ""));
        break;
      default:
        break;
    }
  }

  return out.filter(Boolean).join("\n\n").trim();
}

/* 220 words per minute — the usual reading-speed figure for online prose. The
 * result is rounded UP and floored at 1, because "0 min read" is nonsense and
 * under-promising the length is the friendlier error. */
const WORDS_PER_MINUTE = 220;

export function readingMinutes(blocks: Block[] = []): number {
  const words = toPlainText(blocks).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/**
 * Reading time for a listing card, which never fetches the body.
 *
 * GROQ's length(pt::text(body)) counts CHARACTERS. English prose averages
 * about 5.5 characters per word once spaces are included, so this converts and
 * then applies the same words-per-minute figure. It is an estimate on an
 * estimate and is allowed to disagree with the post page by a minute.
 */
export function readingMinutesFromChars(chars: number | null | undefined): number {
  if (!chars || chars <= 0) return 1;
  return Math.max(1, Math.ceil(chars / 5.5 / WORDS_PER_MINUTE));
}

/** URL-safe id for a heading, stable enough to be linked to from outside. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export type Heading = { id: string; text: string; level: 2 | 3 };

/**
 * Headings for the table of contents.
 *
 * The anchors these produce are not decoration: they are what lets Google
 * offer jump-links straight to a section in the result, and what lets an
 * answer engine cite a specific part of the page rather than the page.
 *
 * Duplicate heading text gets a numeric suffix — two identical ids would make
 * the second one unreachable.
 */
export function extractHeadings(blocks: Block[] = []): Heading[] {
  const seen = new Map<string, number>();
  const headings: Heading[] = [];

  for (const block of blocks) {
    if (!isTextBlock(block)) continue;
    if (block.style !== "h2" && block.style !== "h3") continue;

    const text = spansOf(block).map((s) => s.text).join("").trim();
    if (!text) continue;

    const base = headingId(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);

    headings.push({
      id: count === 0 ? base : `${base}-${count + 1}`,
      text,
      level: block.style === "h2" ? 2 : 3,
    });
  }

  return headings;
}

/**
 * Every FAQ on the page, from both places one can live: a faqBlock inside the
 * body and the post's own closing `faqs` array. FAQPage structured data has to
 * describe the whole page, so emitting only one of the two would advertise
 * questions the reader can see and hide the rest.
 */
export function collectFaqs(post: Pick<Post, "body" | "faqs">): FaqItem[] {
  const fromBody: FaqItem[] = [];
  for (const block of (post.body ?? []) as Block[]) {
    if (block._type !== "faqBlock") continue;
    const items = (block as Record<string, unknown>).items as FaqItem[] | undefined;
    for (const item of items ?? []) {
      if (item?.question && item?.answer) fromBody.push(item);
    }
  }
  const all = [...fromBody, ...(post.faqs ?? [])];

  /* Deduplicate by question: the same question answered twice on one page is a
   * structured-data warning and a reader annoyance. First wins. */
  const seen = new Set<string>();
  return all.filter((item) => {
    const key = item.question.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type StepList = { title: string; steps: { title: string; text?: string }[] };

/** Ordered procedures, for HowTo structured data. */
export function collectSteps(blocks: Block[] = []): StepList[] {
  const lists: StepList[] = [];
  for (const block of blocks) {
    if (block._type !== "stepsBlock") continue;
    const b = block as Record<string, unknown>;
    const steps = (b.steps as { title: string; text?: string }[] | undefined) ?? [];
    if (steps.length >= 2) {
      lists.push({ title: String(b.title ?? ""), steps });
    }
  }
  return lists;
}

/* ---------------------------------------------------------------------------
 * Markdown export
 *
 * Serves /md/<slug> and llms-full.txt. The point is a version of the post that
 * a language model can ingest in one fetch without parsing a page of markup,
 * navigation and CSS — which is most of what it would otherwise download.
 *
 * Links are rendered ABSOLUTE. A model that follows a relative link out of a
 * markdown file it fetched has nothing to resolve it against.
 * ------------------------------------------------------------------------- */

function markdownSpans(block: PortableTextBlock): string {
  const markDefs = (block.markDefs ?? []) as { _key: string; _type: string; href?: string }[];

  return spansOf(block)
    .map((span) => {
      let text = span.text;
      const marks = span.marks ?? [];

      for (const mark of marks) {
        const def = markDefs.find((d) => d._key === mark);
        if (def?._type === "link" && def.href) {
          text = `[${text}](${def.href})`;
        }
      }
      if (marks.includes("code")) text = `\`${text}\``;
      if (marks.includes("strong")) text = `**${text}**`;
      if (marks.includes("em")) text = `_${text}_`;
      return text;
    })
    .join("");
}

export function toMarkdown(blocks: Block[] = []): string {
  const out: string[] = [];
  let listCounter = 0;

  for (const block of blocks) {
    if (isTextBlock(block)) {
      const text = markdownSpans(block);
      if (!text.trim()) continue;

      if (block.listItem === "bullet") {
        listCounter = 0;
        out.push(`- ${text}`);
        continue;
      }
      if (block.listItem === "number") {
        listCounter += 1;
        out.push(`${listCounter}. ${text}`);
        continue;
      }
      listCounter = 0;

      switch (block.style) {
        case "h2":
          out.push(`\n## ${text}`);
          break;
        case "h3":
          out.push(`\n### ${text}`);
          break;
        case "blockquote":
          out.push(`> ${text}`);
          break;
        default:
          out.push(text);
      }
      continue;
    }

    listCounter = 0;
    const b = block as Record<string, unknown>;

    switch (block._type) {
      case "figure": {
        const alt = String(b.alt ?? "");
        const caption = b.caption ? `\n_${b.caption}_` : "";
        const asset = b.asset as { secure_url?: string } | undefined;
        out.push(`![${alt}](${asset?.secure_url ?? ""})${caption}`);
        break;
      }
      case "calloutBlock":
        out.push(`> **${b.title ?? "Note"}** — ${b.text ?? ""}`);
        break;
      case "faqBlock": {
        const items = (b.items as FaqItem[] | undefined) ?? [];
        for (const item of items) {
          out.push(`\n### ${item.question}\n\n${item.answer}`);
        }
        break;
      }
      case "stepsBlock": {
        if (b.title) out.push(`\n### ${b.title}`);
        const steps = (b.steps as { title: string; text?: string }[] | undefined) ?? [];
        steps.forEach((s, i) => {
          out.push(`${i + 1}. **${s.title}**${s.text ? ` — ${s.text}` : ""}`);
        });
        break;
      }
      case "comparisonTable": {
        const columns = (b.columns as string[] | undefined) ?? [];
        const rows = (b.rows as { cells?: string[] }[] | undefined) ?? [];
        if (columns.length) {
          out.push(`\n| ${columns.join(" | ")} |`);
          out.push(`| ${columns.map(() => "---").join(" | ")} |`);
          for (const row of rows) {
            out.push(`| ${(row.cells ?? []).join(" | ")} |`);
          }
          if (b.caption) out.push(`_${b.caption}_`);
        }
        break;
      }
      case "serviceLink": {
        const slug = String(b.serviceSlug ?? "");
        const href = slug === "lead-engine" ? MAIN.leadEngine : MAIN.service(slug);
        out.push(`> ${b.blurb ?? ""} — see [${slug}](${siteUrl(href)})`);
        break;
      }
      case "sourcedStat":
        out.push(
          `**${b.value ?? ""}** — ${b.label ?? ""} ([${b.sourceLabel ?? "source"}](${b.sourceUrl ?? ""}))`,
        );
        break;
      case "codeBlock":
        out.push(`\n\`\`\`${b.language ?? ""}\n${b.code ?? ""}\n\`\`\``);
        break;
      default:
        break;
    }
  }

  return out.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}
