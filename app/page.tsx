import type { Metadata } from "next";
import BlogIndex from "@/components/BlogIndex";
import { BLOG_HERO } from "@/content";
import { getPostCards, getSettings } from "@/lib/content";
import { blogUrl, canonicalPath } from "@/lib/links";
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
      /* The blog's own photo rather than the site-wide og.png — a share of the
       * index should look like the blog, not like the homepage. Absolute, and
       * under /blog, because metadata URLs skip basePath. */
      images: [
        {
          url: blogUrl("/photos/debugswift-blog-drafts-desk.webp"),
          width: 1400,
          height: 933,
          alt: BLOG_HERO.alt,
        },
      ],
    },
  };
}

export default async function BlogIndexPage() {
  const [posts, settings] = await Promise.all([getPostCards(), getSettings()]);

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
      settings={settings}
      page={1}
      totalPages={pageCount(ordered.length)}
    />
  );
}
