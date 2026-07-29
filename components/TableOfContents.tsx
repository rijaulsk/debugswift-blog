import type { Heading } from "@/lib/portableText";

/* Table of contents.
 *
 * Its real job is not navigation — most readers scroll. It is that the anchors
 * exist, are in the HTML, and are linked from within the page: that combination
 * is what lets Google offer "jump to section" links directly in the result, and
 * what lets an answer engine cite one section of the post rather than the whole
 * page. A post with headings but no internal links to them gets neither.
 *
 * Two presentations, because the desktop one was the only one that existed and
 * it was inside a `hidden lg:block` sidebar — which meant phone readers, who
 * are most readers, got no contents at all on a 1,300-word article.
 *
 *   variant="sidebar"    sticky panel beside the body, lg and up
 *   variant="collapsed"  a <details> above the body, below lg
 *
 * The collapsed one is closed by default and native: an accordion above the
 * article should not push the first paragraph off the screen, and a <details>
 * keeps every link in the HTML whether it is open or not — which is the whole
 * point, since the links are for crawlers as much as for readers.
 *
 * Plain anchors, no scroll-spy, no JavaScript. `scroll-mt-28` on the headings
 * themselves (components/PostBody.tsx) is what keeps the sticky header from
 * covering the target after the jump. */
export default function TableOfContents({
  headings,
  variant = "sidebar",
}: {
  headings: Heading[];
  variant?: "sidebar" | "collapsed";
}) {
  /* Two headings do not need a contents list — it would be longer than the
   * thing it indexes. */
  if (headings.length < 3) return null;

  const list = (
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
  );

  if (variant === "collapsed") {
    return (
      <details className="group rounded-card border-[1.5px] border-ink bg-sand p-5 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 marker:hidden">
          <span className="text-eyebrow uppercase text-indigo-600">
            In this post
          </span>
          <span
            aria-hidden="true"
            className="text-indigo-600 transition-transform duration-200 ease-out group-open:rotate-45"
          >
            +
          </span>
        </summary>
        {list}
      </details>
    );
  }

  return (
    <nav
      aria-labelledby="toc-heading"
      className="rounded-card border-[1.5px] border-ink bg-sand p-6"
    >
      <p id="toc-heading" className="text-eyebrow uppercase text-indigo-600">
        In this post
      </p>
      {list}
    </nav>
  );
}
