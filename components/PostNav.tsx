import Link from "next/link";
import { BLOG } from "@/lib/links";
import type { PostCard } from "@/lib/types";

/* Previous / next, in publication order.
 *
 * A different job from the related-posts grid above it, which is why both are
 * on the page. Related answers "more like this". This answers "what else is
 * there", and it is what gives an archive a sense of sequence rather than a
 * pile — as well as guaranteeing that every post is reachable from its
 * neighbours, so nothing is ever orphaned behind pagination.
 *
 * When only one side exists the other cell stays empty rather than collapsing,
 * so "Older" doesn't silently slide into the position a reader has learned
 * means "Newer". */
export default function PostNav({
  previous,
  next,
}: {
  previous: PostCard | null;
  next: PostCard | null;
}) {
  if (!previous && !next) return null;

  const cell =
    "flex h-full flex-col rounded-card border-[1.5px] border-ink bg-paper p-5 transition-colors duration-200 ease-out hover:bg-cream";

  return (
    <nav aria-label="More posts" className="grid gap-4 sm:grid-cols-2">
      {previous ? (
        <Link href={BLOG.post(previous.slug)} className={cell}>
          <span className="text-eyebrow uppercase text-indigo-600">← Older</span>
          <span className="mt-2 font-medium text-ink">{previous.title}</span>
        </Link>
      ) : (
        <div aria-hidden="true" />
      )}

      {next ? (
        <Link href={BLOG.post(next.slug)} className={`${cell} sm:text-right`}>
          <span className="text-eyebrow uppercase text-indigo-600">Newer →</span>
          <span className="mt-2 font-medium text-ink">{next.title}</span>
        </Link>
      ) : (
        <div aria-hidden="true" />
      )}
    </nav>
  );
}
