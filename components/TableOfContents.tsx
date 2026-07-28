import type { Heading } from "@/lib/portableText";

/* Table of contents.
 *
 * Its real job is not navigation — most readers scroll. It is that the anchors
 * exist, are in the HTML, and are linked from within the page: that combination
 * is what lets Google offer "jump to section" links directly in the result, and
 * what lets an answer engine cite one section of the post rather than the whole
 * page. A post with headings but no internal links to them gets neither.
 *
 * Plain anchors, no scroll-spy, no JavaScript. `scroll-mt-28` on the headings
 * themselves (components/PostBody.tsx) is what keeps the sticky header from
 * covering the target after the jump. */
export default function TableOfContents({ headings }: { headings: Heading[] }) {
  /* Two headings do not need a contents list — it would be longer than the
   * thing it indexes. */
  if (headings.length < 3) return null;

  return (
    <nav aria-labelledby="toc-heading" className="rounded-card border-[1.5px] border-ink bg-sand p-6">
      <p id="toc-heading" className="text-eyebrow uppercase text-indigo-600">
        In this post
      </p>
      <ol className="mt-4 space-y-2">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? "pl-4" : undefined}>
            <a
              href={`#${heading.id}`}
              className="text-small text-slate underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-600 hover:underline"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
