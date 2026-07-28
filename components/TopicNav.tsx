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

  const itemClass =
    "shrink-0 rounded-full border-[1.5px] px-4 py-1.5 text-small font-medium transition-colors duration-200 ease-out";

  return (
    <nav
      aria-label="Blog topics"
      className="border-b border-mist bg-cream"
    >
      {/* Scrolls sideways inside its own strip on a phone rather than wrapping
       * to three rows or pushing the page wide. */}
      <div className="mx-auto w-full max-w-canvas overflow-x-auto px-6 py-3 md:px-12">
        <ul className="flex items-center gap-2">
          <li>
            <Link
              href={BLOG.home}
              className={`${itemClass} border-ink text-ink hover:bg-sand`}
            >
              All posts
            </Link>
          </li>
          {topics.map((topic) => (
            <li key={topic.slug}>
              <Link
                href={BLOG.topic(topic.slug)}
                className={`${itemClass} border-mist text-slate hover:border-ink hover:text-ink`}
              >
                {topic.title}
                {topic.postCount > 0 && (
                  <span className="ml-2 text-stone">{topic.postCount}</span>
                )}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={BLOG.topics}
              className="shrink-0 px-2 text-small font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
            >
              All topics →
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
