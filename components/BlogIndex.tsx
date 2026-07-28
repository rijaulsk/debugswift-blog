import Image from "next/image";
import Link from "next/link";
import { BLOG_HERO } from "@/content";
import CircuitPattern from "@/components/CircuitPattern";
import Eyebrow from "@/components/Eyebrow";
import JsonLd from "@/components/JsonLd";
import Pagination from "@/components/Pagination";
import PostCard from "@/components/PostCard";
import SubscribeBlock from "@/components/SubscribeBlock";
import type { BlogSettings } from "@/lib/content";
import { BLOG, blogUrl, publicAsset } from "@/lib/links";
import { collectionPageJsonLd } from "@/lib/seo";
import type { PostCard as PostCardType, Topic } from "@/lib/types";

/* The index, shared by /blog and /blog/page/[n].
 *
 * One component rather than two nearly-identical pages: the layout, the schema
 * and the empty state have to stay in step, and the usual way they stop is one
 * of the two files getting a fix the other doesn't.
 *
 * The featured card only appears on page one. On page four it would be an
 * arbitrary post given twice the visual weight of the ones around it for no
 * reason a reader could work out. */
export default function BlogIndex({
  posts,
  topics,
  settings,
  page,
  totalPages,
}: {
  posts: PostCardType[];
  topics: (Topic & { postCount: number })[];
  settings: BlogSettings;
  page: number;
  totalPages: number;
}) {
  const isFirstPage = page === 1;
  const featured = isFirstPage ? posts[0] : undefined;
  const rest = isFirstPage ? posts.slice(1) : posts;
  const url = page === 1 ? blogUrl("/") : blogUrl(`/page/${page}`);

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            collectionPageJsonLd({
              name: settings.title,
              description: settings.description,
              url,
              posts,
            }),
          ],
        }}
      />

      {/* Hero. Circuit motif at ≤8%, no clay — the only clay in this page's
       * first viewport would otherwise fight the subscribe CTA further down.
       *
       * The photograph appears on page one only. On page four it is decoration
       * the reader has already scrolled past, taking the space the posts they
       * came back for should occupy. */}
      <section className="relative overflow-hidden border-b-[1.5px] border-mist">
        <CircuitPattern opacity={0.07} />
        <div className="relative mx-auto w-full max-w-canvas px-6 pt-16 pb-12 text-center md:px-12 md:pt-24 md:pb-16 lg:text-left">
          <div
            className={
              isFirstPage
                ? "grid items-center gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
                : undefined
            }
          >
            <div>
              <Eyebrow>{isFirstPage ? "The blog" : `Page ${page}`}</Eyebrow>
              <h1 className="mx-auto mt-4 max-w-3xl text-h1-mobile text-ink md:text-h1 lg:mx-0">
                {settings.title}
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-slate lg:mx-0">{settings.lede}</p>

              {topics.length > 0 && (
                <nav aria-label="Topics" className="mt-8">
                  <ul className="flex flex-wrap justify-center gap-2 lg:justify-start">
                    {topics.map((topic) => (
                      <li key={topic.slug}>
                        <Link
                          href={BLOG.topic(topic.slug)}
                          className="inline-flex items-center rounded-full border-[1.5px] border-ink px-4 py-2 text-small font-medium text-ink transition-colors duration-200 ease-out hover:bg-sand"
                        >
                          {topic.title}
                          <span className="ml-2 text-stone">{topic.postCount}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
            </div>

            {isFirstPage && (
              <figure className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
                <Image
                  src={publicAsset(BLOG_HERO.src)}
                  alt={BLOG_HERO.alt}
                  width={BLOG_HERO.width}
                  height={BLOG_HERO.height}
                  /* LCP candidate on the index — the cards below are lazy,
                   * this one is not. */
                  priority
                  sizes="(max-width: 1024px) 90vw, 520px"
                  className="w-full rounded-card border-[1.5px] border-ink object-cover"
                />
                <figcaption className="mt-3 text-small text-slate">
                  {BLOG_HERO.caption}
                </figcaption>
              </figure>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-canvas px-6 py-14 md:px-12 md:py-20">
        {posts.length === 0 ? (
          /* An honest empty state. This is what renders if Sanity is configured
           * and the dataset has nothing in it — deliberately, rather than
           * falling back to the local demo post and looking healthy. See the
           * note at the top of lib/content.ts. */
          <div className="mx-auto max-w-xl text-center">
            <Eyebrow>Nothing published yet</Eyebrow>
            <p className="mt-4 text-h3 text-ink">
              The first pieces are still being written.
            </p>
            <p className="mt-4 text-slate">
              We&apos;d rather publish nothing than publish filler. Leave an email
              below and you&apos;ll know when there&apos;s something worth reading.
            </p>
          </div>
        ) : (
          <>
            {/* The page's ONE intentional grid break: the lead post spans the
             * full canvas while everything under it sits in a three-column
             * rhythm. */}
            {featured && (
              <div className="mb-10">
                <PostCard post={featured} featured />
              </div>
            )}

            {rest.length > 0 && (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
            )}

            <div className="mt-14">
              <Pagination page={page} total={totalPages} />
            </div>
          </>
        )}
      </section>

      <section className="mx-auto w-full max-w-canvas px-6 pb-20 md:px-12 md:pb-28">
        <SubscribeBlock location="blog:index" />
      </section>
    </main>
  );
}
