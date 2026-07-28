import Image from "next/image";
import { BLOG_HERO } from "@/content";
import CircuitPattern from "@/components/CircuitPattern";
import Eyebrow from "@/components/Eyebrow";
import JsonLd from "@/components/JsonLd";
import Pagination from "@/components/Pagination";
import PostGrid from "@/components/PostGrid";
import SubscribeBlock from "@/components/SubscribeBlock";
import type { BlogSettings } from "@/lib/content";
import { blogUrl, publicAsset } from "@/lib/links";
import { collectionPageJsonLd } from "@/lib/seo";
import type { PostCard as PostCardType } from "@/lib/types";

/* The index, shared by /blog and /blog/page/[n].
 *
 * One component rather than two nearly-identical pages: the layout, the schema
 * and the empty state have to stay in step, and the usual way they stop is one
 * of the two files getting a fix the other doesn't.
 *
 * Two things that used to be here have moved, on purpose:
 *   · the topic chips are now components/TopicNav.tsx in the layout, so
 *     categories are reachable from every blog page rather than only this one;
 *   · search is now inside components/PostGrid.tsx, which replaced the separate
 *     /blog/search route. */
export default function BlogIndex({
  posts,
  settings,
  page,
  totalPages,
}: {
  posts: PostCardType[];
  settings: BlogSettings;
  page: number;
  totalPages: number;
}) {
  const isFirstPage = page === 1;
  const url = isFirstPage ? blogUrl("/") : blogUrl(`/page/${page}`);

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
            <PostGrid posts={posts} showFeatured={isFirstPage} />
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
