import Image from "next/image";
import Link from "next/link";
import { formatDate, isoDate } from "@/lib/format";
import { BLOG, publicAsset } from "@/lib/links";
import type { PostCard as PostCardType } from "@/lib/types";

/* A post in a listing.
 *
 * Flat, 1.5px Ink border, 14px radius, no shadow — the design system's card, not
 * a new one. The whole card is not a link: the heading is. A block-level anchor
 * wrapping an image, a heading, a date and a topic gives screen readers one
 * enormous link whose accessible name is the entire card, and it makes the
 * topic pill (a second, different destination) impossible to nest legally.
 * The ::after trick below keeps the large click target without that cost. */
export default function PostCard({ post }: { post: PostCardType }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border-[1.5px] border-ink bg-paper transition-colors duration-200 ease-out hover:bg-cream">
      {post.cover && (
        <Image
          src={publicAsset(post.cover.src)}
          alt={post.cover.alt}
          width={post.cover.width}
          height={post.cover.height}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
          className="h-48 w-full border-b-[1.5px] border-ink object-cover"
        />
      )}

      <div className="flex flex-1 flex-col p-6">
        {post.topic && (
          /* Sits ABOVE the heading's overlay (z-10) so it stays independently
           * clickable — see the note about the ::after target below. */
          <Link
            href={BLOG.topic(post.topic.slug)}
            className="relative z-10 self-start text-eyebrow uppercase text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
          >
            {post.topic.title}
          </Link>
        )}

        <h3 className="mt-3 text-balance break-words text-h3 text-ink">
          {/* The ::after spans the card, so the whole tile is clickable while the
           * link's accessible name stays just the title. */}
          <Link
            href={BLOG.post(post.slug)}
            className="after:absolute after:inset-0 after:content-[''] group-hover:text-indigo-700"
          >
            {post.title}
          </Link>
        </h3>

        <p className="mt-3 flex-1 text-small text-slate">{post.excerpt}</p>

        <p className="mt-5 text-small text-slate">
          <time dateTime={isoDate(post.publishedAt)}>
            {formatDate(post.publishedAt)}
          </time>
          {" · "}
          {post.readingMinutes} min read
          {post.isGuest && (
            <>
              {" · "}
              <span className="text-indigo-600">Guest post</span>
            </>
          )}
        </p>
      </div>
    </article>
  );
}
