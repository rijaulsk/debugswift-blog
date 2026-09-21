"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Eyebrow from "@/components/Eyebrow";
import PostCard from "@/components/PostCard";
import { BLOG } from "@/lib/links";
import type { PostCard as PostCardType } from "@/lib/types";

/* The post list, with search built into it.
 *
 * This replaces the separate /blog/search page. A dedicated search route was a
 * page whose entire content was an input box — nothing to index, nothing to
 * link to, and one more click between a reader and the thing they came for.
 * Filtering the list they are already looking at is both simpler and faster.
 *
 * The index is the posts already on the page, so there is no second payload and
 * no request: results appear on the first keystroke. That holds until the
 * archive outgrows one page of pagination, at which point search would need to
 * cover posts this page doesn't have — see the note in lib/pagination.ts.
 *
 * Matching is deliberately literal: every word in the query must appear
 * somewhere in the title, excerpt or topic. No fuzzy matching and no ranking
 * model — on a small archive those add "why did THAT come up?" without adding
 * anything a reader would notice. */
export default function PostGrid({ posts }: { posts: PostCardType[] }) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();

  const results = useMemo(() => {
    const terms = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return posts;
    return posts.filter((post) => {
      const haystack =
        `${post.title} ${post.excerpt} ${post.topic?.title ?? ""} ${post.author.name}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [posts, trimmed]);

  const searching = trimmed.length > 0;

  return (
    <>
      <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <label htmlFor="post-search" className="sr-only">
            Search posts
          </label>
          <input
            id="post-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search: try “enquiries” or “spreadsheet”"
            autoComplete="off"
            className="w-full rounded-full border-[1.5px] border-ink bg-paper px-5 py-3 text-ink placeholder:text-stone focus:outline-none focus-visible:border-indigo-600"
          />
        </div>
        <p aria-live="polite" className="text-small text-slate">
          {searching
            ? `${results.length} of ${posts.length} post${posts.length === 1 ? "" : "s"}`
            : `${posts.length} post${posts.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {results.length === 0 ? (
        <div className="max-w-xl">
          <Eyebrow>No matches</Eyebrow>
          <p className="mt-3 text-h3 text-ink">
            Nothing here uses those words.
          </p>
          <p className="mt-3 text-slate">
            Try{" "}
            <button
              type="button"
              onClick={() => setQuery("")}
              className="font-medium text-indigo-600 underline underline-offset-4 hover:text-indigo-700"
            >
              clearing the search
            </button>
            , or browse by{" "}
            <Link
              href={BLOG.topics}
              className="font-medium text-indigo-600 underline underline-offset-4 hover:text-indigo-700"
            >
              topic
            </Link>{" "}
            , and they&apos;re grouped by problem, not by vocabulary.
          </p>
        </div>
      ) : (
        /* One rhythm, every card the same. The first post used to be promoted to
         * a full-width horizontal card as the page's intentional grid break —
         * removed 23 Aug 2026 (owner's call). At 768px it rendered 672px wide
         * against 320px neighbours, which is not a grid break so much as a
         * different layout bolted onto the top of one, and it gave the newest
         * post twice the weight for no reason a reader could work out. */
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </>
  );
}
