import type { PortableTextBlock, PortableTextSpan } from "@portabletext/types";

import type { BodyBlock, Post } from "@/lib/types";

/* A post -> the drafts/<slug>.md format. The inverse of scripts/lib/draftFormat.ts.
 *
 * WHY THIS IS NOT lib/portableText.ts's toMarkdown(). That one feeds
 * /blog/md/<slug>, the feeds and llms-full.txt, where the audience is a reader
 * or a language model and a service link should read as a sentence
 * ("> blurb — see [slug](url)"). This one feeds `npm run push`, where the same
 * block has to survive the trip back as a ```ds-service fence. Two audiences,
 * two serialisers; merging them would make one of them wrong.
 *
 * Round-tripping is stable in MEANING, not byte-for-byte. `[**a**](url)` and
 * `**[a](url)**` both parse to a span marked strong + link, and this emits the
 * first form for both. Compare parsed bodies, not file text.
 */

const DECORATORS = new Set(["strong", "em", "code"]);

const isTextBlock = (b: BodyBlock): b is PortableTextBlock => b._type === "block";

function spanToMarkdown(span: PortableTextSpan, markDefs: { _key?: string; href?: string }[]): string {
  const marks = span.marks ?? [];
  let text = span.text ?? "";

  /* Innermost first, so the wrappers nest the way the parser reads them. */
  if (marks.includes("code")) text = `\`${text}\``;
  if (marks.includes("em")) text = `_${text}_`;
  if (marks.includes("strong")) text = `**${text}**`;

  const linkKey = marks.find((mark) => !DECORATORS.has(mark));
  if (linkKey) {
    const def = markDefs.find((d) => d._key === linkKey);
    if (def?.href) text = `[${text}](${def.href})`;
  }

  return text;
}

function textBlockToMarkdown(block: PortableTextBlock): string {
  const markDefs = (block.markDefs ?? []) as { _key?: string; href?: string }[];
  const text = (block.children ?? [])
    .filter((c): c is PortableTextSpan => (c as { _type?: string })._type === "span")
    .map((span) => spanToMarkdown(span, markDefs))
    .join("");

  const listItem = (block as { listItem?: string }).listItem;
  if (listItem === "bullet") return `- ${text}`;
  if (listItem === "number") return `1. ${text}`;

  switch (block.style) {
    case "h2":
      return `## ${text}`;
    case "h3":
      return `### ${text}`;
    case "blockquote":
      return `> ${text}`;
    default:
      return text;
  }
}

const fence = (tag: string, body: string): string => `\`\`\`${tag}\n${body}\n\`\`\``;
const jsonFence = (tag: string, value: unknown): string =>
  fence(tag, JSON.stringify(value, null, 2));

function customBlockToMarkdown(block: BodyBlock): string {
  const b = block as Record<string, unknown>;

  switch (block._type) {
    case "calloutBlock":
      return jsonFence("ds-callout", {
        tone: b.tone === "warning" ? "warning" : "note",
        ...(b.title ? { title: b.title } : {}),
        text: b.text ?? "",
      });

    case "faqBlock":
      return jsonFence(
        "ds-faq",
        ((b.items as { question?: string; answer?: string }[]) ?? []).map((item) => ({
          question: item.question ?? "",
          answer: item.answer ?? "",
        })),
      );

    case "stepsBlock":
      return jsonFence("ds-steps", {
        ...(b.title ? { title: b.title } : {}),
        steps: ((b.steps as { title?: string; text?: string }[]) ?? []).map((step) => ({
          title: step.title ?? "",
          ...(step.text ? { text: step.text } : {}),
        })),
      });

    case "comparisonTable":
      return jsonFence("ds-table", {
        ...(b.caption ? { caption: b.caption } : {}),
        columns: (b.columns as string[]) ?? [],
        rows: ((b.rows as { cells?: string[] }[]) ?? []).map((row) => row.cells ?? []),
      });

    case "serviceLink":
      return jsonFence("ds-service", {
        serviceSlug: b.serviceSlug ?? "",
        blurb: b.blurb ?? "",
      });

    case "sourcedStat":
      return jsonFence("ds-stat", {
        value: b.value ?? "",
        label: b.label ?? "",
        sourceLabel: b.sourceLabel ?? "",
        sourceUrl: b.sourceUrl ?? "",
      });

    case "figure":
      return jsonFence("ds-figure", {
        publicId: (b.asset as { public_id?: string } | undefined)?.public_id ?? "",
        alt: b.alt ?? "",
        ...(b.caption ? { caption: b.caption } : {}),
      });

    case "codeBlock":
      /* A code sample is a plain fence tagged with its language — which is
       * exactly how the parser reads anything without a ds- prefix. */
      return fence(String(b.language ?? "text"), String(b.code ?? ""));

    default:
      return jsonFence(`ds-unknown-${String(block._type)}`, b);
  }
}

export function bodyToDraftMarkdown(blocks: BodyBlock[] = []): string {
  return blocks
    .map((block) => (isTextBlock(block) ? textBlockToMarkdown(block) : customBlockToMarkdown(block)))
    .join("\n\n");
}

/** Frontmatter is scalars only, one key per line, values written literally. */
function frontmatter(post: Post): string {
  const lines: [string, string][] = [
    ["title", post.title],
    ["slug", post.slug],
    ["excerpt", post.excerpt],
    ["topic", post.topic?.slug ?? ""],
    ["author", post.author.slug],
    ["publishedAt", post.publishedAt],
    ["updatedAt", post.updatedAt ?? ""],
    ["cover", post.cover?.publicId ?? ""],
    ["coverAlt", post.cover?.alt ?? ""],
    ["seoTitle", post.seoTitle ?? ""],
    ["seoDescription", post.seoDescription ?? ""],
    ["noindex", post.noindex ? "true" : "false"],
  ];

  const width = Math.max(...lines.map(([key]) => key.length));
  return [
    "---",
    ...lines.map(([key, value]) => `${key}:${" ".repeat(width - key.length + 1)}${value}`),
    "---",
  ].join("\n");
}

export function toDraftMarkdown(post: Post): string {
  const parts = [frontmatter(post), ""];

  parts.push(fence("ds-short-answer", post.shortAnswer), "");

  if (post.keyTakeaways.length) {
    parts.push(fence("ds-takeaways", post.keyTakeaways.join("\n")), "");
  }

  parts.push(bodyToDraftMarkdown(post.body));

  if (post.faqs.length) {
    parts.push("", jsonFence("ds-closing-faq", post.faqs));
  }
  if (post.sources.length) {
    parts.push("", jsonFence("ds-sources", post.sources));
  }

  return `${parts.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}
