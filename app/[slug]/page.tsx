import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AudioPlayer from "@/components/AudioPlayer";
import AuthorBox from "@/components/AuthorBox";
import Breadcrumbs from "@/components/Breadcrumbs";
import Button from "@/components/Button";
import Eyebrow from "@/components/Eyebrow";
import FaqList from "@/components/FaqList";
import JsonLd from "@/components/JsonLd";
import PostBody from "@/components/PostBody";
import PostCard from "@/components/PostCard";
import PostNav from "@/components/PostNav";
import ShareRow from "@/components/ShareRow";
import SubscribeBlock from "@/components/SubscribeBlock";
import TableOfContents from "@/components/TableOfContents";
import {
  getAdjacentPosts,
  getPost,
  getPostIndex,
  getRelatedPosts,
  getTopics,
} from "@/lib/content";
import { formatDate, isoDate } from "@/lib/format";
import { BLOG, blogUrl, canonicalPath, MAIN, publicAsset } from "@/lib/links";
import { extractHeadings } from "@/lib/portableText";
import { breadcrumbsFor, ogImageFor, postGraph } from "@/lib/seo";

/* A post.
 *
 * Reading order is chosen for two audiences at once, and where they disagree
 * the machine loses:
 *
 *   title → byline → SHORT ANSWER → cover → takeaways/contents → body
 *
 * The short answer sits above the cover image deliberately. A full-width photo
 * between the headline and the first real sentence pushes the answer below the
 * fold on a phone, which costs the featured snippet the field exists to win and
 * makes a reader scroll past a picture to find out whether the page is worth
 * reading. The cover still appears — just after the page has answered the
 * question in its title. */

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const index = await getPostIndex();
  return index.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath(`/${post.slug}`),
      types: {
        /* Announces the markdown twin at /blog/md/<slug>. An LLM fetcher that
         * honours this gets the prose without downloading a page of markup,
         * navigation and CSS to find it. */
        "text/markdown": [{ url: blogUrl(`/md/${post.slug}`), title }],
      },
    },
    /* noindex also strips the post from the sitemap, the feeds and llms.txt —
     * a page told not to be indexed shouldn't be advertised in five other
     * places. See app/sitemap.ts. */
    ...(post.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "article",
      title,
      description,
      url: blogUrl(`/${post.slug}`),
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      authors: [post.author.name],
      ...(post.topic ? { section: post.topic.title } : {}),
      /* Cloudinary crops the cover to exactly 1200×630 with smart gravity, so
       * the share card is always the right shape. See ogImageFor(). */
      images: [ogImageFor(post)],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageFor(post).url],
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const headings = extractHeadings(post.body);
  const [related, topics, adjacent] = await Promise.all([
    getRelatedPosts(post),
    /* Only fetched to fill the "keep reading" section when there are no
     * related posts to show — see the note on that section below. */
    getTopics(),
    getAdjacentPosts(post.slug),
  ]);
  const url = blogUrl(`/${post.slug}`);

  return (
    <main>
      <JsonLd data={postGraph(post)} />

      <article>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="mx-auto w-full max-w-canvas px-6 pt-10 md:px-12 md:pt-14">
          <Breadcrumbs trail={breadcrumbsFor(post)} />

          <div className="mt-8 max-w-3xl">
            {post.topic && (
              <Link href={BLOG.topic(post.topic.slug)}>
                <Eyebrow className="transition-colors duration-200 ease-out hover:text-indigo-700">
                  {post.topic.title}
                </Eyebrow>
              </Link>
            )}

            <h1 className="mt-4 text-h1-mobile text-ink md:text-h1">{post.title}</h1>

            <p className="mt-6 text-small text-slate">
              By{" "}
              <Link
                href={BLOG.author(post.author.slug)}
                className="font-medium text-slate underline-offset-4 hover:text-indigo-600 hover:underline"
              >
                {post.author.name}
              </Link>
              {" · "}
              <time dateTime={isoDate(post.publishedAt)}>
                {formatDate(post.publishedAt)}
              </time>
              {post.updatedAt && (
                <>
                  {" · Updated "}
                  <time dateTime={isoDate(post.updatedAt)}>
                    {formatDate(post.updatedAt)}
                  </time>
                </>
              )}
              {" · "}
              {post.readingMinutes} min read
            </p>
          </div>

          {/* ── The short answer ─────────────────────────────────────────────
            * id="short-answer" is referenced by the speakable specification in
            * lib/seo.ts. Renaming it breaks the voice-result markup silently. */}
          <div
            id="short-answer"
            className="mt-8 max-w-3xl rounded-card border-[1.5px] border-ink bg-sand p-6"
          >
            <p className="text-eyebrow uppercase text-indigo-600">Short answer</p>
            <p className="mt-3 text-ink">{post.shortAnswer}</p>
          </div>

          {/* Sits directly under the short answer, above the cover: someone who
            * would rather listen should not have to scroll past a photograph
            * and a table of contents to discover that they can. */}
          {post.audio && (
            <div className="mt-6 max-w-3xl">
              <AudioPlayer audio={post.audio} />
            </div>
          )}

          {post.cover && (
            <figure className="mt-10">
              <Image
                src={publicAsset(post.cover.src)}
                alt={post.cover.alt}
                width={post.cover.width}
                height={post.cover.height}
                /* The one priority image on the page — it is the LCP candidate
                 * on every post. */
                priority
                sizes="(max-width: 768px) 100vw, 1320px"
                className="w-full rounded-card border-[1.5px] border-ink object-cover"
              />
            </figure>
          )}
        </header>

        {/* ── Body + sidebar ─────────────────────────────────────────────── */}
        <div className="mx-auto w-full max-w-canvas px-6 py-12 md:px-12 md:py-16">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
            <div className="min-w-0 max-w-2xl">
              {/* Contents, for the readers the sidebar never reached. The
                * sidebar below is lg-and-up only, so on a phone this was the
                * difference between having a table of contents and not. */}
              <div className="mb-10 lg:hidden">
                <TableOfContents headings={headings} variant="collapsed" />
              </div>

              {post.keyTakeaways.length > 0 && (
                <section
                  aria-labelledby="takeaways"
                  className="mb-12 rounded-card border-[1.5px] border-ink bg-paper p-6"
                >
                  <p id="takeaways" className="text-eyebrow uppercase text-indigo-600">
                    The short version
                  </p>
                  <ul className="mt-4 space-y-3">
                    {post.keyTakeaways.map((point) => (
                      <li key={point} className="flex gap-3 text-ink">
                        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-500" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <PostBody value={post.body} isGuest={post.author.isGuest} />

              {/* The post's closing FAQ array.
                *
                * This MUST render. lib/seo.ts compiles it into the FAQPage
                * structured data together with any faqBlock in the body, and
                * Google's rule is that FAQ markup describes questions the
                * reader can see. Leaving it out advertised five questions and
                * showed two — the kind of mismatch that gets a rich result
                * pulled rather than merely ignored. */}
              {post.faqs.length > 0 && (
                <section aria-labelledby="post-faqs" className="mt-14">
                  <FaqList
                    items={post.faqs}
                    heading="Still wondering"
                    headingId="post-faqs"
                  />
                </section>
              )}

              {post.sources.length > 0 && (
                <section aria-labelledby="sources" className="mt-14 border-t-[1.5px] border-mist pt-8">
                  <p id="sources" className="text-eyebrow uppercase text-indigo-600">
                    Sources
                  </p>
                  <ol className="mt-4 space-y-2">
                    {post.sources.map((source) => (
                      <li key={source.url} className="text-small text-slate">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener nofollow"
                          className="underline underline-offset-4 hover:text-indigo-600"
                        >
                          {source.label}
                        </a>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* The post's one clay element — and the only CTA on the page. */}
              <section className="mt-14 rounded-card border-[1.5px] border-ink bg-cream p-6 md:p-8">
                <p className="text-eyebrow uppercase text-indigo-600">
                  What&apos;s slowing your business down?
                </p>
                <p className="mt-3 max-w-xl text-h3 text-ink">
                  Twenty minutes, one honest answer, no invoice.
                </p>
                <p className="mt-3 max-w-xl text-slate">
                  We&apos;ll tell you what we&apos;d fix first — and if the answer
                  is &ldquo;nothing yet&rdquo;, we&apos;ll say that too.
                </p>
                <div className="mt-6">
                  <Button href={MAIN.diagnosis}>Book a free diagnosis</Button>
                </div>
              </section>

              <div className="mt-10">
                <ShareRow url={url} title={post.title} />
              </div>

              <div className="mt-10">
                <AuthorBox author={post.author} />
              </div>

              {/* Sequence, not similarity — the related grid below covers
                * "more like this". This is what stops any post being a dead
                * end, including ones stranded behind pagination. */}
              <div className="mt-10">
                <PostNav previous={adjacent.previous} next={adjacent.next} />
              </div>
            </div>

            {/* Sticky sidebar. lg+ only — on a phone a contents list above the
             * article is one more thing between the reader and the first
             * sentence. */}
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <TableOfContents headings={headings} />
              </div>
            </aside>
          </div>
        </div>
      </article>

      {/* Keep reading.
        *
        * This section used to disappear entirely when there was nothing to
        * show, which is exactly when a reader most needs somewhere to go: with
        * one post published, finishing it left a dead end. It now always
        * renders — related posts when they exist, the topic list when they
        * don't. A reader who got to the bottom is the most engaged one on the
        * site, and handing them nothing is the worst moment to do it. */}
      <section className="border-t-[1.5px] border-mist bg-sand">
        <div className="mx-auto w-full max-w-canvas px-6 py-14 md:px-12 md:py-20">
          <Eyebrow>Keep reading</Eyebrow>
          <h2 className="mt-3 text-balance break-words text-h2-mobile text-ink md:text-h2">
            {related.length > 0
              ? post.topic
                ? `More on ${post.topic.title.toLowerCase()}`
                : "More posts"
              : "Nothing else on this yet"}
          </h2>

          {related.length > 0 ? (
            <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <PostCard key={item.slug} post={item} />
              ))}
            </div>
          ) : (
            <>
              <p className="mt-4 max-w-xl text-slate">
                This is the first piece we&apos;ve published. Here&apos;s what
                else is coming — pick the one that sounds like your week.
              </p>
              <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {topics.map((topic) => (
                  <li key={topic.slug}>
                    <Link
                      href={BLOG.topic(topic.slug)}
                      className="flex h-full flex-col rounded-card border-[1.5px] border-ink bg-paper p-5 transition-colors duration-200 ease-out hover:bg-cream"
                    >
                      <span className="font-medium text-ink">{topic.title}</span>
                      <span className="mt-2 text-small text-slate">
                        {topic.description}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-canvas px-6 py-16 md:px-12 md:py-20">
        <SubscribeBlock location={`post:${post.slug}`} />
      </section>
    </main>
  );
}
