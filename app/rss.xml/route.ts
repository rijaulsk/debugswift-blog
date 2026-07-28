import { getAllPosts, getSettings } from "@/lib/content";
import { blogUrl } from "@/lib/links";
import { toMarkdown } from "@/lib/portableText";
import { CONTACT_EMAIL } from "@/lib/site";

/* RSS 2.0, at /blog/rss.xml.
 *
 * Full content in <content:encoded>, not a teaser. A truncated feed exists to
 * force a click; this blog has nothing to sell on the page that it isn't
 * already saying in the post, so the feed gives readers the whole thing. It
 * also means a feed reader, an aggregator or a model ingesting the feed gets
 * the actual article rather than a hundred-word stub.
 *
 * Markdown rather than HTML in the payload: the body's real shape is Portable
 * Text, and serialising it to markdown is lossless for everything a feed reader
 * displays, while HTML would need escaping rules for eight custom block types.
 */

export const dynamic = "force-static";

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/* CDATA can only be closed by the exact sequence "]]>", so splitting that
 * sequence is the whole escape — the content itself needs no other treatment. */
function cdata(input: string): string {
  return `<![CDATA[${input.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

export async function GET() {
  const [posts, settings] = await Promise.all([getAllPosts(), getSettings()]);
  const published = posts.filter((post) => !post.noindex);

  const items = published
    .map((post) => {
      const url = blogUrl(`/${post.slug}`);
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <dc:creator>${escapeXml(post.author.name)}</dc:creator>
      ${post.topic ? `<category>${escapeXml(post.topic.title)}</category>` : ""}
      <description>${escapeXml(post.excerpt)}</description>
      <content:encoded>${cdata(`${post.shortAnswer}\n\n${toMarkdown(post.body)}`)}</content:encoded>
    </item>`;
    })
    .join("\n");

  const latest = published[0]?.publishedAt;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(settings.title)}</title>
    <link>${blogUrl("/")}</link>
    <description>${escapeXml(settings.description)}</description>
    <language>en</language>
    <managingEditor>${CONTACT_EMAIL} (DebugSwift)</managingEditor>
    ${latest ? `<lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>` : ""}
    <atom:link href="${blogUrl("/rss.xml")}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
