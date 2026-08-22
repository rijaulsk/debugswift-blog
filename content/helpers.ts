import type { PortableTextBlock } from "@portabletext/types";

/* Builders for the local content in this folder.
 *
 * These produce EXACTLY the shape Sanity returns — same _type, same _key, same
 * markDefs wiring — because scripts/seed.ts pushes these objects straight into
 * the dataset. If the local content and the Sanity content had different
 * shapes, the demo post would render one way before seeding and another way
 * after, and the seam would only show up in production.
 *
 * The inline mini-syntax covers EXACTLY the marks the schema defines and
 * nothing else: **bold** -> strong, _em_ -> em, `code` -> code, and
 * [label](url) -> a link annotation. That is the whole of postBody's decorator
 * and annotation list in sanity/schemaTypes/blocks.ts. Anything beyond it is a
 * block type, and block types belong in the Studio.
 *
 * These builders are also what scripts/lib/draftToPortableText.ts uses to turn
 * a drafts/<slug>.md file into a post, so this is the only implementation of
 * the inline syntax in the repo. Two parsers would drift, and drift between
 * local content and pushed content is exactly what the paragraph above warns
 * about. */

let counter = 0;
/** Deterministic within a module load; Sanity only needs keys to be unique
 *  within their array. */
const key = (prefix = "k") => `${prefix}${(counter += 1)}`;

/**
 * Restarts the key counter.
 *
 * sanity/lib/postTemplate.ts already does this per call, for the same reason:
 * so two documents built in one process don't share _keys. The draft converter
 * calls it once per file, which also means an unchanged draft pushed twice
 * produces a byte-identical body and leaves a clean diff in the Studio.
 *
 * Module-level mutable state, so: one document at a time, never concurrently
 * within a process.
 */
export function resetKeys(): void {
  counter = 0;
}

type Span = { _type: "span"; _key: string; text: string; marks: string[] };
type MarkDef = { _key: string; _type: "link"; href: string; nofollow?: boolean };

/**
 * Parse the four inline forms into spans + markDefs.
 *
 *   [label](url)  -> a link annotation
 *   **bold**      -> strong
 *   `code`        -> code
 *   _em_          -> em
 *
 * One pass, one regex, alternating between the forms. Order inside the
 * alternation matters twice over: the link pattern is tried first so a bolded
 * link label isn't eaten, and `code` comes before _em_ so an underscore inside
 * a code span — `snake_case` — is never italicised.
 *
 * NOTE THE SHAPE OF THE _em_ BRANCH. It captures the preceding character rather
 * than using a lookbehind, and that is not a style choice: this module is in the
 * app's import graph (content/posts/* -> lib/content.ts), so a (?<!\w) would be
 * shipped to browsers, and Safari below 16.4 throws a SYNTAX error on lookbehind
 * at parse time — a blank page, not a degraded one. Capturing the character and
 * handing it back as plain text is ES5-safe and stops my_var_name italicising
 * just as well.
 */
export function parseInline(input: string): { children: Span[]; markDefs: MarkDef[] } {
  const children: Span[] = [];
  const markDefs: MarkDef[] = [];

  const push = (text: string, marks: string[]) => {
    if (!text) return;
    children.push({ _type: "span", _key: key("s"), text, marks });
  };

  /* Marks NEST, because a span in Portable Text carries an array of them. So
   * **[a link](url)** is one span marked ["strong", <linkKey>] rather than a
   * bold span containing literal brackets — which is what a non-recursive pass
   * produces, and it renders the raw markdown on the page for a reader to see.
   * `code` is the one form that does not recurse: its content is literal. */
  const walk = (text: string, inherited: string[]) => {
    const pattern =
      /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|(^|[\s(])_([^_]+)_(?=$|[\s.,;:!?)])/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      push(text.slice(lastIndex, match.index), inherited);

      if (match[1] !== undefined) {
        const markKey = key("m");
        markDefs.push({ _key: markKey, _type: "link", href: match[2] });
        walk(match[1], [...inherited, markKey]);
      } else if (match[3] !== undefined) {
        walk(match[3], [...inherited, "strong"]);
      } else if (match[4] !== undefined) {
        push(match[4], [...inherited, "code"]);
      } else {
        /* match[5] is the character before the underscore. It belongs to the
         * surrounding prose, so hand it straight back. */
        push(match[5], inherited);
        walk(match[6], [...inherited, "em"]);
      }
      lastIndex = pattern.lastIndex;
    }
    push(text.slice(lastIndex), inherited);
  };

  walk(input, []);

  return { children, markDefs };
}

export function textBlock(
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

/**
 * An image.
 *
 * The asset here is a STUB carrying only the public_id. Cloudinary's real
 * response — secure_url, width, height, format — is what the schema field
 * holds and what lib/portableText.ts reads, and none of it can be guessed:
 * scripts/push.ts looks the public_id up against the Cloudinary Admin API and
 * replaces this object with the answer before anything is written.
 *
 * That is also why there was no figure helper before. A TypeScript file in
 * content/ cannot reference an asset nobody has uploaded, so figures stayed
 * Studio-only. A draft file can, because the CLI verifies the id exists and
 * fails loudly when it does not.
 */
export const figure = (publicId: string, alt: string, caption?: string) => ({
  _type: "figure",
  _key: key("fig"),
  asset: { _type: "cloudinary.asset", public_id: publicId },
  alt,
  ...(caption ? { caption } : {}),
});

/** A code sample. Monospace, no highlighting library. */
export const code = (language: string, source: string) => ({
  _type: "codeBlock",
  _key: key("code"),
  language,
  code: source,
});
