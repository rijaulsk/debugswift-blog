import { getAllPosts, getSettings } from "@/lib/content";
import { blogUrl } from "@/lib/links";
import { toMarkdown } from "@/lib/portableText";

/* JSON Feed 1.1, at /blog/feed.json.
 *
 * Alongside RSS rather than instead of it. RSS is what the installed base of
 * readers speaks; JSON Feed is what anything written in the last decade would
 * rather consume — including scripts and ingestion pipelines, which is the
 * reason it earns its place here. Both are generated from the same data, so
 * neither can drift.
 *
 * content_text (markdown), not content_html: same reasoning as the RSS feed —
 * the body's real shape is Portable Text, and markdown round-trips it without
 * inventing escaping rules for eight custom block types. */

export const dynamic = "force-static";

export async function GET() {
  const [posts, settings] = await Promise.all([getAllPosts(), getSettings()]);
  const published = posts.filter((post) => !post.noindex);

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: settings.title,
    description: settings.description,
    home_page_url: blogUrl("/"),
    feed_url: blogUrl("/feed.json"),
    language: "en",
    authors: [{ name: "DebugSwift", url: "https://debugswift.com" }],
    items: published.map((post) => ({
      id: blogUrl(`/${post.slug}`),
      url: blogUrl(`/${post.slug}`),
      title: post.title,
      summary: post.excerpt,
      content_text: `${post.shortAnswer}\n\n${toMarkdown(post.body)}`,
      date_published: post.publishedAt,
      ...(post.updatedAt ? { date_modified: post.updatedAt } : {}),
      ...(post.cover ? { image: post.cover.src } : {}),
      ...(post.topic ? { tags: [post.topic.title] } : {}),
      authors: [
        { name: post.author.name, url: blogUrl(`/authors/${post.author.slug}`) },
      ],
    })),
  };

  return Response.json(feed, {
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
