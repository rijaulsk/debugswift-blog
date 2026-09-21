import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import Eyebrow from "@/components/Eyebrow";
import { getTopics } from "@/lib/content";
import { BLOG, blogUrl, canonicalPath, siteUrl } from "@/lib/links";

/* The hub of hubs.
 *
 * Every topic is listed, including empty ones — this page is where the blog's
 * intended shape is visible, and a topic with nothing under it yet is honest
 * information rather than a broken promise. (The index page's chips hide empty
 * topics, because there a chip is an invitation to click.) */

export const metadata: Metadata = {
  title: "Topics",
  description:
    "Everything on the DebugSwift blog, grouped by the problem it solves: answering enquiries, automating busywork, websites that earn their keep, getting found, and buying technology well.",
  alternates: { canonical: canonicalPath("/topics") },
};

export default async function TopicsPage() {
  const topics = await getTopics();

  return (
    <main className="mx-auto w-full max-w-canvas px-6 py-10 md:px-12 md:py-14">
      <Breadcrumbs
        trail={[
          { name: "Home", url: siteUrl("/") },
          { name: "Blog", url: blogUrl("/") },
          { name: "Topics", url: blogUrl("/topics") },
        ]}
      />

      <div className="mt-8 max-w-3xl">
        <Eyebrow>Topics</Eyebrow>
        <h1 className="mt-4 text-h1-mobile text-ink md:text-h1">
          Grouped by the problem, not the technology.
        </h1>
        <p className="mt-5 text-slate">
          Nobody wakes up wanting an automation. They wake up with an inbox
          that&apos;s been ignored since Friday. These are the problems we write
          about.
        </p>
      </div>

      <ul className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <li key={topic.slug}>
            <Link
              href={BLOG.topic(topic.slug)}
              className="flex h-full flex-col rounded-card border-[1.5px] border-ink bg-paper p-6 transition-colors duration-200 ease-out hover:bg-cream"
            >
              <p className="text-h3 text-ink">{topic.title}</p>
              <p className="mt-3 flex-1 text-small text-slate">{topic.description}</p>
              <p className="mt-5 text-small text-slate">
                {topic.postCount === 0
                  ? "Nothing published yet"
                  : `${topic.postCount} post${topic.postCount === 1 ? "" : "s"}`}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
