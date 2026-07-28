"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Eyebrow from "@/components/Eyebrow";
import { BLOG } from "@/lib/links";

export type SearchEntry = {
  slug: string;
  title: string;
  excerpt: string;
  topic: string | null;
  date: string;
};

/* Site search, entirely in the browser.
 *
 * The index is embedded in the page rather than fetched: for a blog of this
 * size the whole thing is a few kilobytes, and embedding means results appear
 * on the first keystroke with no network round trip and no search service to
 * pay for, rate-limit or keep in sync.
 *
 * That trade flips somewhere north of ~300 posts, when the payload starts
 * costing more than the round trip would. At that point move the index to a
 * route handler and fetch it on first input — the matching below doesn't change.
 *
 * Matching is deliberately dumb: every query word must appear somewhere in the
 * title, excerpt or topic. No fuzzy matching, no stemming, no ranking model.
 * On a small corpus those add failure modes ("why did THAT come up?") and buy
 * nothing a reader would notice. */
export default function SearchClient({ entries }: { entries: SearchEntry[] }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return entries.filter((entry) => {
      const haystack = `${entry.title} ${entry.excerpt} ${entry.topic ?? ""}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [entries, query]);

  return (
    <>
      <label htmlFor="blog-search" className="sr-only">
        Search the blog
      </label>
      <input
        id="blog-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="What's the problem?"
        autoComplete="off"
        className="mt-8 w-full max-w-xl rounded-full border-[1.5px] border-ink bg-paper px-5 py-3 text-ink placeholder:text-stone focus:outline-none focus-visible:border-indigo-600"
      />

      <div className="mt-10">
        {!query.trim() ? (
          <p className="text-slate">
            {entries.length} post{entries.length === 1 ? "" : "s"} to search.
          </p>
        ) : results.length === 0 ? (
          <div className="max-w-xl">
            <Eyebrow>No matches</Eyebrow>
            <p className="mt-3 text-slate">
              Nothing here uses those words. Try the{" "}
              <Link
                href={BLOG.topics}
                className="font-medium text-indigo-600 underline underline-offset-4"
              >
                topics
              </Link>{" "}
              instead — they&apos;re grouped by problem, not by vocabulary.
            </p>
          </div>
        ) : (
          <>
            <Eyebrow>
              {results.length} match{results.length === 1 ? "" : "es"}
            </Eyebrow>
            <ul className="mt-6 divide-y-[1.5px] divide-mist border-y-[1.5px] border-mist">
              {results.map((entry) => (
                <li key={entry.slug} className="py-5">
                  <Link href={BLOG.post(entry.slug)} className="group block">
                    <p className="text-h3 text-ink group-hover:text-indigo-700">
                      {entry.title}
                    </p>
                    <p className="mt-2 text-small text-slate">{entry.excerpt}</p>
                    {entry.topic && (
                      <p className="mt-2 text-eyebrow uppercase text-indigo-600">
                        {entry.topic}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
