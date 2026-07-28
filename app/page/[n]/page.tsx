import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import BlogIndex from "@/components/BlogIndex";
import { getPostCards, getSettings, getTopics } from "@/lib/content";
import { canonicalPath } from "@/lib/links";
import { pageCount, pageSlice } from "@/lib/pagination";

/* Pages two and up.
 *
 * Three deliberate decisions here:
 *
 *   · /page/1 REDIRECTS to /blog. Serving page one at two URLs is duplicate
 *     content, and a canonical tag pointing elsewhere is a weaker fix than the
 *     URL simply not existing.
 *   · Paginated pages are INDEXED, each canonical to itself. The old advice to
 *     noindex them (or canonical them all to page one) hides every post past
 *     the twelfth from search — the posts on page four are not duplicates of
 *     anything, they are just older.
 *   · A page number past the end 404s rather than rendering empty. An
 *     infinite supply of empty, indexable URLs is a crawl budget leak.
 */

type Props = { params: Promise<{ n: string }> };

async function resolvePage(n: string) {
  const page = Number(n);
  if (!Number.isInteger(page) || page < 1) notFound();

  const [posts, topics, settings] = await Promise.all([
    getPostCards(),
    getTopics(),
    getSettings(),
  ]);

  const ordered = settings.featuredSlug
    ? [
        ...posts.filter((p) => p.slug === settings.featuredSlug),
        ...posts.filter((p) => p.slug !== settings.featuredSlug),
      ]
    : posts;

  const totalPages = pageCount(ordered.length);
  if (page > totalPages) notFound();

  return { page, ordered, topics, settings, totalPages };
}

export async function generateStaticParams() {
  const posts = await getPostCards();
  const total = pageCount(posts.length);
  /* Page 1 is excluded — it redirects, so prerendering it would only bake the
   * redirect into a static file for no benefit. */
  return Array.from({ length: Math.max(0, total - 1) }, (_, i) => ({
    n: String(i + 2),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { n } = await params;
  const settings = await getSettings();
  const page = Number(n);

  return {
    title: `${settings.title} — page ${page}`,
    description: settings.description,
    alternates: { canonical: canonicalPath(`/page/${page}`) },
  };
}

export default async function PaginatedIndexPage({ params }: Props) {
  const { n } = await params;
  if (n === "1") redirect("/");

  const { page, ordered, topics, settings, totalPages } = await resolvePage(n);

  return (
    <BlogIndex
      posts={pageSlice(ordered, page)}
      topics={topics.filter((t) => t.postCount > 0)}
      settings={settings}
      page={page}
      totalPages={totalPages}
    />
  );
}
