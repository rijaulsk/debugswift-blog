import type { MetadataRoute } from "next";
import { getAuthorSlugs, getPostIndex, getTopics } from "@/lib/content";
import { blogUrl } from "@/lib/links";
import { pageCount } from "@/lib/pagination";

/* Served at /blog/sitemap.xml.
 *
 * The main deployment's robots.txt already points at this URL — that reference
 * predates this repo (see the `sitemap` array in E:\debugswift\app\robots.ts),
 * and it is the ONLY way a crawler learns this file exists: a proxied
 * subdirectory cannot serve a robots.txt of its own, so this app must never
 * ship one.
 *
 * Absolute URLs throughout, built with blogUrl(). Next does not apply basePath
 * to metadata routes, so a relative path here would advertise every post at
 * debugswift.com/<slug> — the wrong deployment entirely.
 *
 * What is deliberately ABSENT:
 *   · /studio  — the CMS
 *   · /submit/* — tokened, single-use, private by construction
 *   · noindex posts — a page told not to be indexed should not be advertised
 *   · empty topic hubs with no pillar body — thin pages get indexed and drag,
 *     and listing one is asking for exactly that
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [index, topics, authorSlugs] = await Promise.all([
    getPostIndex(),
    getTopics(),
    getAuthorSlugs(),
  ]);

  const posts = index.filter((post) => !post.noindex);

  /* lastModified for the index is the newest post's date, not "now": a sitemap
   * that claims every page changed on every build teaches crawlers to ignore
   * the field. */
  const newest = posts
    .map((p) => p.updatedAt ?? p.publishedAt)
    .sort()
    .at(-1);

  const entries: MetadataRoute.Sitemap = [
    {
      url: blogUrl("/"),
      lastModified: newest ? new Date(newest) : undefined,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: blogUrl("/topics"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: blogUrl("/write-for-us"),
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];

  /* Paginated index pages. Page 1 is the index above; /page/1 redirects. */
  for (let n = 2; n <= pageCount(posts.length); n += 1) {
    entries.push({
      url: blogUrl(`/page/${n}`),
      changeFrequency: "weekly",
      priority: 0.4,
    });
  }

  for (const topic of topics) {
    if (!topic.pillar && topic.postCount === 0) continue;
    entries.push({
      url: blogUrl(`/topics/${topic.slug}`),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  for (const post of posts) {
    entries.push({
      url: blogUrl(`/${post.slug}`),
      lastModified: new Date(post.updatedAt ?? post.publishedAt),
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  for (const slug of authorSlugs) {
    entries.push({
      url: blogUrl(`/authors/${slug}`),
      changeFrequency: "monthly",
      priority: 0.3,
    });
  }

  return entries;
}
