import Link from "next/link";
import { getTopics } from "@/lib/content";
import { BLOG } from "@/lib/links";

/* The blog's own navigation strip, under the site header on every blog route.
 *
 * It exists because there was no way to reach a category from anywhere except
 * the post you happened to be reading. A post linked up to its OWN topic and
 * nothing else, /topics was buried in the footer, and the only topic list was
 * on the index — so from a post, the other four topics were unreachable
 * without going back to the start.
 *
 * Real <Link>s to real /topics/<slug> URLs rather than a client-side filter:
 * a topic hub is a page that should rank on its own, and a filter that only
 * exists in the browser is invisible to search and impossible to link to.
 *
 * EMPTY TOPICS ARE SHOWN, with no count beside them. That is the opposite of
 * what the index chips used to do, and the reversal is deliberate: hiding them
 * meant that with one post published there was exactly one topic, the strip
 * hid itself, and the blog had no visible categories at all — the original
 * complaint. Five topics with one full is an honest picture of a young blog and
 * tells a reader what it is going to cover. An empty hub says so plainly rather
 * than pretending, and is noindexed until it has a pillar body or a post. */
export default async function TopicNav() {
  const topics = await getTopics();
  if (topics.length === 0) return null;

  /* whitespace-nowrap is load-bearing, not tidiness. Without it a chip is free
   * to wrap INSIDE its own pill: "Websites that earn their keep" became four
   * stacked lines with the rounded border broken around them, and the strip
   * read as collapsed rather than scrollable. shrink-0 was already here but sat
   * on the <a>, while the flex children are the <li>s — so the li shrank below
   * its content and the anchor wrapped inside it. Both need it. */
  const itemClass =
    "block shrink-0 whitespace-nowrap rounded-full border-[1.5px] px-4 py-1.5 text-small font-medium transition-colors duration-200 ease-out";

  return (
    <nav
      aria-label="Blog topics"
      className="border-b border-mist bg-cream"
    >
      {/* Scrolls sideways on a phone, wraps on a desktop.
       *
       * One row of chips is ~1,250px once the titles are not allowed to break
       * mid-pill, so scrolling everywhere would hide two topics behind a
       * horizontal scrollbar at 1024px — a sideways scroll is a normal gesture
       * on a phone and a bad surprise with a mouse. Below lg it scrolls; from lg
       * it wraps to a second row, which at 1440px it does not need anyway.
       *
       * The horizontal padding belongs to the UL, not to the scroll container.
       * Padding on a scroller only holds on the leading edge: scroll to the end
       * and the last chip butts against the viewport with nothing after it. On
       * the list it travels with the content, so both ends keep their margin. */}
      <div className="mx-auto w-full max-w-canvas overflow-x-auto py-3 lg:overflow-x-visible">
        <ul className="flex w-max items-center gap-2 px-6 md:px-12 lg:w-auto lg:flex-wrap lg:gap-y-2">
          <li className="shrink-0">
            <Link
              href={BLOG.home}
              className={`${itemClass} border-ink text-ink hover:bg-sand`}
            >
              All posts
            </Link>
          </li>
          {topics.map((topic) => (
            <li key={topic.slug} className="shrink-0">
              <Link
                href={BLOG.topic(topic.slug)}
                className={`${itemClass} border-mist text-slate hover:border-ink hover:text-ink`}
              >
                {topic.title}
                {/* Slate, not Stone. Stone on Cream measures 2.24:1, which
                 * fails WCAG AA at every text size — and this count is real
                 * information, not decoration. Stone stays for placeholders
                 * and genuinely decorative marks only.
                 *
                 * The comment sits OUTSIDE the && expression: a {\/* *\/} block
                 * inside `cond && ( … )` is parsed as an object literal, not a
                 * comment, and fails the build. */}
                {topic.postCount > 0 && (
                  <span className="ml-2 text-slate">{topic.postCount}</span>
                )}
              </Link>
            </li>
          ))}
          <li className="shrink-0">
            <Link
              href={BLOG.topics}
              className="block shrink-0 whitespace-nowrap px-2 text-small font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
            >
              All topics →
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
