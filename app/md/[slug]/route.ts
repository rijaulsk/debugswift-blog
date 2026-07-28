import { getPost, getPostIndex } from "@/lib/content";
import { blogUrl } from "@/lib/links";
import { toMarkdown } from "@/lib/portableText";

/* A post as raw markdown, at /blog/md/<slug>.
 *
 * This is a GEO surface, not a developer convenience. A model fetching a post
 * page downloads the layout, the header, the footer, the navigation, the CSS
 * and the JSON-LD in order to find about four kilobytes of prose. This route
 * hands over the prose, with front matter carrying the metadata that would
 * otherwise have to be inferred from markup.
 *
 * Every post page announces it via <link rel="alternate" type="text/markdown">
 * (see the `alternates.types` block in app/[slug]/page.tsx), and llms.txt lists
 * these URLs alongside the canonical ones. A crawler that ignores all of that
 * loses nothing — the HTML is still complete and still static.
 *
 * Served as text/plain rather than text/markdown, deliberately: browsers do not
 * render text/markdown and offer it as a download instead, which makes the URL
 * useless to a human checking what a model sees. The rel="alternate" link and
 * llms.txt both still declare it as markdown. */

export const dynamic = "force-static";

export async function generateStaticParams() {
  const index = await getPostIndex();
  return index.filter((post) => !post.noindex).map(({ slug }) => ({ slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post || post.noindex) {
    return new Response("Not found", { status: 404 });
  }

  const frontMatter = [
    "---",
    `title: ${JSON.stringify(post.title)}`,
    `description: ${JSON.stringify(post.excerpt)}`,
    `url: ${blogUrl(`/${post.slug}`)}`,
    `author: ${JSON.stringify(post.author.name)}`,
    `published: ${post.publishedAt}`,
    ...(post.updatedAt ? [`updated: ${post.updatedAt}`] : []),
    ...(post.topic ? [`topic: ${JSON.stringify(post.topic.title)}`] : []),
    `publisher: "DebugSwift"`,
    ...(post.author.isGuest ? ["guest_post: true"] : []),
    "---",
  ].join("\n");

  const takeaways = post.keyTakeaways.length
    ? `\n## Key takeaways\n\n${post.keyTakeaways.map((t) => `- ${t}`).join("\n")}\n`
    : "";

  const faqs = post.faqs.length
    ? `\n## Questions\n\n${post.faqs
        .map((faq) => `### ${faq.question}\n\n${faq.answer}`)
        .join("\n\n")}\n`
    : "";

  const sources = post.sources.length
    ? `\n## Sources\n\n${post.sources.map((s) => `- [${s.label}](${s.url})`).join("\n")}\n`
    : "";

  const body = [
    frontMatter,
    `\n# ${post.title}`,
    `\n## Short answer\n\n${post.shortAnswer}`,
    takeaways,
    `\n${toMarkdown(post.body)}`,
    faqs,
    sources,
  ]
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return new Response(`${body}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
