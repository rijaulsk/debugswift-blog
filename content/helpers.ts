import type { PortableTextBlock } from "@portabletext/types";

/* Builders for the local content in this folder.
 *
 * These produce EXACTLY the shape Sanity returns — same _type, same _key, same
 * markDefs wiring — because scripts/seed.ts pushes these objects straight into
 * the dataset. If the local content and the Sanity content had different
 * shapes, the demo post would render one way before seeding and another way
 * after, and the seam would only show up in production.
 *
 * The inline mini-syntax is deliberately tiny: **bold** and [label](url), and
 * nothing else. Anything more expressive belongs in the Studio, not in a
 * TypeScript file. */

let counter = 0;
/** Deterministic within a module load; Sanity only needs keys to be unique
 *  within their array. */
const key = (prefix = "k") => `${prefix}${(counter += 1)}`;

type Span = { _type: "span"; _key: string; text: string; marks: string[] };
type MarkDef = { _key: string; _type: "link"; href: string; nofollow?: boolean };

/** Parse **bold** and [label](url) into spans + markDefs. */
function parseInline(input: string): { children: Span[]; markDefs: MarkDef[] } {
  const children: Span[] = [];
  const markDefs: MarkDef[] = [];

  /* One pass, one regex, alternating between the two forms. Order matters:
   * the link pattern is tried first so a bolded link label isn't eaten. */
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const push = (text: string, marks: string[]) => {
    if (!text) return;
    children.push({ _type: "span", _key: key("s"), text, marks });
  };

  while ((match = pattern.exec(input)) !== null) {
    push(input.slice(lastIndex, match.index), []);

    if (match[1] !== undefined) {
      const markKey = key("m");
      markDefs.push({ _key: markKey, _type: "link", href: match[2] });
      push(match[1], [markKey]);
    } else {
      push(match[3], ["strong"]);
    }
    lastIndex = pattern.lastIndex;
  }
  push(input.slice(lastIndex), []);

  return { children, markDefs };
}

function textBlock(
  style: "normal" | "h2" | "h3" | "blockquote",
  text: string,
  listItem?: "bullet" | "number",
): PortableTextBlock {
  const { children, markDefs } = parseInline(text);
  return {
    _type: "block",
    _key: key("b"),
    style,
    markDefs,
    children,
    ...(listItem ? { listItem, level: 1 } : {}),
  } as PortableTextBlock;
}

export const para = (text: string) => textBlock("normal", text);
export const h2 = (text: string) => textBlock("h2", text);
export const h3 = (text: string) => textBlock("h3", text);
export const quote = (text: string) => textBlock("blockquote", text);
export const bullets = (items: string[]) =>
  items.map((item) => textBlock("normal", item, "bullet"));
export const numbered = (items: string[]) =>
  items.map((item) => textBlock("normal", item, "number"));

export const callout = (
  title: string,
  text: string,
  tone: "note" | "warning" = "note",
) => ({ _type: "calloutBlock", _key: key("c"), tone, title, text });

export const faqBlock = (items: { question: string; answer: string }[]) => ({
  _type: "faqBlock",
  _key: key("f"),
  items: items.map((item) => ({ ...item, _key: key("fi") })),
});

export const steps = (title: string, list: { title: string; text?: string }[]) => ({
  _type: "stepsBlock",
  _key: key("st"),
  title,
  steps: list.map((step) => ({ ...step, _key: key("sti") })),
});

export const table = (caption: string, columns: string[], rows: string[][]) => ({
  _type: "comparisonTable",
  _key: key("t"),
  caption,
  columns,
  rows: rows.map((cells) => ({ _key: key("tr"), cells })),
});

export const serviceLink = (serviceSlug: string, blurb: string) => ({
  _type: "serviceLink",
  _key: key("sl"),
  serviceSlug,
  blurb,
});

export const sourcedStat = (
  value: string,
  label: string,
  sourceLabel: string,
  sourceUrl: string,
) => ({ _type: "sourcedStat", _key: key("ss"), value, label, sourceLabel, sourceUrl });
