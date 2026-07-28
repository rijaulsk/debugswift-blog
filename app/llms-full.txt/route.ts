import { getAllPosts, getSettings } from "@/lib/content";
import { blogUrl } from "@/lib/links";
import { toMarkdown } from "@/lib/portableText";

/* /blog/llms-full.txt — every post, in full, in one request.
 *
 * The companion to llms.txt: that file is the map, this is the territory. A
 * model that wants the whole corpus can take it in a single fetch instead of
 * following a list of links and downloading a page of markup around each one.
 *
 * Everything here is already public. The only thing this changes is the cost of
 * reading it — which is the entire point, because the alternative is being
 * summarised from whatever fragment a crawler happened to reach.
 *
 * This grows linearly with the archive. At a few hundred posts it stops being a
 * sensible single response; the fix at that point is to shard it by topic and
 * list the shards in llms.txt, not to truncate it. */

export const dynamic = "force-static";

export async function GET() {
  const [posts, settings] = await Promise.all([getAllPosts(), getSettings()]);
  const published = posts.filter((post) => !post.noindex);

  const header = [
    `# ${settings.title}`,
    "",
    `> ${settings.description}`,
    "",
    `Source: ${blogUrl("/")}`,
    `Index: ${blogUrl("/llms.txt")}`,
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    `Posts: ${published.length}`,
    "",
    "Published by DebugSwift, a founder-led technology agency in Kolkata, India.",
    "",
    "---",
    "",
  ].join("\n");

  const body = published
    .map((post) => {
      const meta = [
        `# ${post.title}`,
        "",
        `URL: ${blogUrl(`/${post.slug}`)}`,
        `Author: ${post.author.name}${post.author.isGuest ? " (guest contributor)" : ""}`,
        `Published: ${post.publishedAt.slice(0, 10)}`,
        ...(post.updatedAt ? [`Updated: ${post.updatedAt.slice(0, 10)}`] : []),
        ...(post.topic ? [`Topic: ${post.topic.title}`] : []),
        "",
        `## Short answer`,
        "",
        post.shortAnswer,
        "",
      ];

      if (post.keyTakeaways.length) {
        meta.push("## Key takeaways", "", ...post.keyTakeaways.map((t) => `- ${t}`), "");
      }

      const faqs = post.faqs.length
        ? ["", "## Questions", "", ...post.faqs.map((f) => `### ${f.question}\n\n${f.answer}`)]
        : [];

      const sources = post.sources.length
        ? ["", "## Sources", "", ...post.sources.map((s) => `- ${s.label}: ${s.url}`)]
        : [];

      return [...meta, toMarkdown(post.body), ...faqs, ...sources].join("\n");
    })
    .join("\n\n---\n\n");

  return new Response(`${header}${body}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
