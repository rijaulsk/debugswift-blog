import type { Metadata } from "next";
import BlogIndex from "@/components/BlogIndex";
import { getPostCards, getSettings, getTopics } from "@/lib/content";
import { canonicalPath } from "@/lib/links";
import { pageCount, pageSlice } from "@/lib/pagination";

/* The blog index, served at /blog (basePath does the prefixing).
 *
 * Page one only. /blog/page/1 redirects here rather than rendering the same
 * twelve posts at a second URL — see app/page/[n]/page.tsx. */

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: settings.title,
    description: settings.description,
    alternates: { canonical: canonicalPath("/") },
    openGraph: {
      type: "website",
      title: settings.title,
      description: settings.description,
    },
  };
}

export default async function BlogIndexPage() {
  const [posts, topics, settings] = await Promise.all([
    getPostCards(),
    getTopics(),
    getSettings(),
  ]);

  /* A pinned post is moved to the front rather than duplicated — it still
   * appears exactly once, just first. */
  const ordered = settings.featuredSlug
    ? [
        ...posts.filter((p) => p.slug === settings.featuredSlug),
        ...posts.filter((p) => p.slug !== settings.featuredSlug),
      ]
    : posts;

  return (
    <BlogIndex
      posts={pageSlice(ordered, 1)}
      /* Empty topics are hidden from the index chips: a chip that leads to
       * "no posts yet" is a promise the page can't keep. The hub still exists
       * and is still reachable from /topics. */
      topics={topics.filter((t) => t.postCount > 0)}
      settings={settings}
      page={1}
      totalPages={pageCount(ordered.length)}
    />
  );
}
