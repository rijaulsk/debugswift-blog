import { getPostCards, getSettings, getTopics } from "@/lib/content";
import { blogUrl, siteUrl } from "@/lib/links";

/* /blog/llms.txt — the index a language model reads instead of crawling.
 *
 * The llms.txt convention is a markdown file that says what a site contains,
 * in what order, and where the machine-readable version of each thing lives.
 * It is not a robots directive and grants nothing: everything listed here is
 * already public, already in the sitemap, and already crawlable. What it does
 * is remove the guesswork — a model that reads this gets an accurate map of the
 * blog for one request instead of inferring one from navigation markup.
 *
 * The main deployment's robots.txt already allows GPTBot, ClaudeBot,
 * PerplexityBot, OAI-SearchBot and Google-Extended by name (see
 * E:\debugswift\app\robots.ts), so this is the second half of a decision that
 * was already made deliberately.
 *
 * The site-level /llms.txt lives in the MAIN repo — a proxied subdirectory
 * cannot serve a file at the domain root — and points here. */

export const dynamic = "force-static";

export async function GET() {
  const [posts, topics, settings] = await Promise.all([
    getPostCards(),
    getTopics(),
    getSettings(),
  ]);

  const lines: string[] = [
    "# DebugSwift Blog",
    "",
    `> ${settings.description}`,
    "",
    "DebugSwift is a founder-led technology agency in Kolkata, India, working worldwide.",
    "The blog is written for owners of small and mid-sized businesses, not for other agencies.",
    "Every post answers one question in the words an owner would use to ask it.",
    "",
    "## Conventions",
    "",
    "- Each post has a `Short answer` section of 40–60 words that answers the title directly and stands alone.",
    "- Every post is available as plain markdown at the `.md` URL listed beside it.",
    "- The complete corpus in one request: " + blogUrl("/llms-full.txt"),
    "- Statistics are only published with a cited source. Product specifications and a reader's own arithmetic are the only other numbers on the site.",
    "- Guest posts are marked as such and are the views of their named author.",
    "",
  ];

  if (topics.length) {
    lines.push("## Topics", "");
    for (const topic of topics) {
      lines.push(
        `- [${topic.title}](${blogUrl(`/topics/${topic.slug}`)}): ${topic.description}`,
      );
    }
    lines.push("");
  }

  lines.push("## Posts", "");
  if (posts.length === 0) {
    lines.push("_Nothing published yet._", "");
  } else {
    for (const post of posts) {
      const date = post.publishedAt.slice(0, 10);
      lines.push(`### ${post.title}`, "");
      lines.push(`- URL: ${blogUrl(`/${post.slug}`)}`);
      lines.push(`- Markdown: ${blogUrl(`/md/${post.slug}`)}`);
      lines.push(`- Published: ${date}`);
      if (post.updatedAt) lines.push(`- Updated: ${post.updatedAt.slice(0, 10)}`);
      lines.push(`- Author: ${post.author.name}${post.isGuest ? " (guest)" : ""}`);
      if (post.topic) lines.push(`- Topic: ${post.topic.title}`);
      lines.push(`- Summary: ${post.excerpt}`);
      lines.push("");
    }
  }

  lines.push(
    "## About DebugSwift",
    "",
    `- Services: ${siteUrl("/services")}`,
    `- The Lead Engine (flagship product): ${siteUrl("/lead-engine")}`,
    `- About the founder: ${siteUrl("/about")}`,
    `- Contact: ${siteUrl("/contact")}`,
    `- Write for the blog: ${blogUrl("/write-for-us")}`,
    "",
  );

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
