import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import Eyebrow from "@/components/Eyebrow";
import SearchClient, { type SearchEntry } from "@/components/SearchClient";
import { getPostCards } from "@/lib/content";
import { blogUrl, siteUrl } from "@/lib/links";

/* Search.
 *
 * noindex, and that is not an oversight. A search page has no content of its
 * own — indexing it produces a result whose entire value is "here is a box you
 * can type in", and if query strings ever get indexed alongside it, an unbounded
 * set of near-empty URLs. follow:true so the links out of it still count.
 *
 * It is also excluded from the sitemap and Disallowed in the main deployment's
 * robots.txt (E:\debugswift\app\robots.ts). */

export const metadata: Metadata = {
  title: "Search",
  description: "Search the DebugSwift blog.",
  robots: { index: false, follow: true },
};

export default async function SearchPage() {
  const posts = await getPostCards();

  const entries: SearchEntry[] = posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    topic: post.topic?.title ?? null,
    date: post.publishedAt,
  }));

  return (
    <main className="mx-auto w-full max-w-canvas px-6 py-10 md:px-12 md:py-14">
      <Breadcrumbs
        trail={[
          { name: "Home", url: siteUrl("/") },
          { name: "Blog", url: blogUrl("/") },
          { name: "Search", url: blogUrl("/search") },
        ]}
      />

      <div className="mt-8 max-w-3xl">
        <Eyebrow>Search</Eyebrow>
        <h1 className="mt-4 text-h1-mobile text-ink md:text-h1">
          Find the post about your problem.
        </h1>
        <SearchClient entries={entries} />
      </div>
    </main>
  );
}
