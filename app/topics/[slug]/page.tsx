import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import Eyebrow from "@/components/Eyebrow";
import JsonLd from "@/components/JsonLd";
import PostBody from "@/components/PostBody";
import PostCard from "@/components/PostCard";
import SubscribeBlock from "@/components/SubscribeBlock";
import { getPostsByTopic, getTopic, getTopics } from "@/lib/content";
import { canonicalPath, blogUrl, MAIN } from "@/lib/links";
import { getService } from "@/lib/nav";
import { breadcrumbJsonLd, collectionPageJsonLd, topicBreadcrumbs } from "@/lib/seo";

/* A topic hub — the pillar page of a cluster.
 *
 * What makes this more than a tag list is the `pillar` body: the broad answer
 * the cluster sits under, with the posts below answering the narrow versions.
 * Until that body is written the page renders as a listing AND excludes itself
 * from the sitemap (app/sitemap.ts) — shipping a thin page is worse than
 * shipping no page, because the thin one gets indexed.
 *
 * The link across to the matching service page is the other half of the
 * internal triangle: services ↔ blog ↔ tools. */

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const topics = await getTopics();
  return topics.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopic(slug);
  if (!topic) return {};

  const posts = await getPostsByTopic(slug);
  const thin = !topic.pillar && posts.length === 0;

  return {
    title: topic.title,
    description: topic.description,
    alternates: { canonical: canonicalPath(`/topics/${topic.slug}`) },
    /* An empty hub with no pillar body has nothing on it worth indexing yet.
     * follow:true so the links out of it still carry. */
    ...(thin ? { robots: { index: false, follow: true } } : {}),
    openGraph: { type: "website", title: topic.title, description: topic.description },
  };
}

export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  const [topic, posts] = await Promise.all([getTopic(slug), getPostsByTopic(slug)]);
  if (!topic) notFound();

  const service = topic.serviceSlug ? getService(topic.serviceSlug) : undefined;
  const url = blogUrl(`/topics/${topic.slug}`);

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            collectionPageJsonLd({
              name: topic.title,
              description: topic.description,
              url,
              posts,
            }),
            breadcrumbJsonLd(topicBreadcrumbs(topic)),
          ],
        }}
      />

      <div className="mx-auto w-full max-w-canvas px-6 pt-10 md:px-12 md:pt-14">
        <Breadcrumbs trail={topicBreadcrumbs(topic)} />

        <div className="mt-8 max-w-3xl">
          <Eyebrow>Topic</Eyebrow>
          <h1 className="mt-4 text-h1-mobile text-ink md:text-h1">{topic.title}</h1>
          <p className="mt-5 text-slate">{topic.description}</p>
        </div>

        {topic.pillar && (
          <div className="mt-12 max-w-2xl">
            <PostBody value={topic.pillar} />
          </div>
        )}

        {service && (
          <aside className="mt-12 max-w-2xl rounded-card border-[1.5px] border-ink bg-paper p-6">
            <p className="text-eyebrow uppercase text-indigo-600">If you want it fixed</p>
            <p className="mt-2 text-h3 text-ink">{service.name}</p>
            <p className="mt-2 text-slate">{service.navLine}</p>
            {/* Main site — bare <a>, or basePath would rewrite it. */}
            <a
              href={MAIN.service(service.slug)}
              className="mt-4 inline-flex items-center font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
            >
              See what&apos;s involved →
            </a>
          </aside>
        )}
      </div>

      <section className="mx-auto w-full max-w-canvas px-6 py-14 md:px-12 md:py-20">
        {posts.length === 0 ? (
          <p className="max-w-xl text-slate">
            Nothing published under this topic yet. It&apos;s on the list.
          </p>
        ) : (
          <>
            <Eyebrow>{posts.length} post{posts.length === 1 ? "" : "s"}</Eyebrow>
            <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="mx-auto w-full max-w-canvas px-6 pb-20 md:px-12 md:pb-28">
        <SubscribeBlock location={`topic:${topic.slug}`} />
      </section>
    </main>
  );
}
