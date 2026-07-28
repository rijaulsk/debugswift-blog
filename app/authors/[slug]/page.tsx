import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AuthorBox from "@/components/AuthorBox";
import Breadcrumbs from "@/components/Breadcrumbs";
import Eyebrow from "@/components/Eyebrow";
import JsonLd from "@/components/JsonLd";
import PostCard from "@/components/PostCard";
import { getAuthor, getAuthorSlugs, getPostsByAuthor } from "@/lib/content";
import { blogUrl, canonicalPath, siteUrl } from "@/lib/links";
import { breadcrumbJsonLd, personJsonLd } from "@/lib/seo";

/* An author page.
 *
 * This is the E-E-A-T surface. Search engines and answer engines both weight
 * "who says this, and what else have they said" — a byline that links nowhere
 * is a byline that establishes nothing. The Person node here carries the same
 * @id the post pages reference, so the two describe one person rather than two.
 *
 * Only real, consenting people have documents here. See
 * sanity/schemaTypes/author.ts. */

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getAuthorSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author) return {};

  return {
    title: author.name,
    description: author.bio,
    alternates: { canonical: canonicalPath(`/authors/${author.slug}`) },
    openGraph: { type: "profile", title: author.name, description: author.bio },
  };
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params;
  const [author, posts] = await Promise.all([getAuthor(slug), getPostsByAuthor(slug)]);
  if (!author) notFound();

  const trail = [
    { name: "Home", url: siteUrl("/") },
    { name: "Blog", url: blogUrl("/") },
    { name: author.name, url: blogUrl(`/authors/${author.slug}`) },
  ];

  return (
    <main className="mx-auto w-full max-w-canvas px-6 py-10 md:px-12 md:py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [personJsonLd(author), breadcrumbJsonLd(trail)],
        }}
      />

      <Breadcrumbs trail={trail} />

      <div className="mt-8 max-w-3xl">
        <Eyebrow>{author.isGuest ? "Guest contributor" : "Author"}</Eyebrow>
        <h1 className="mt-4 text-h1-mobile text-ink md:text-h1">{author.name}</h1>
      </div>

      <div className="mt-10 max-w-2xl">
        <AuthorBox author={author} />
      </div>

      <section className="mt-16">
        {posts.length === 0 ? (
          <p className="text-slate">Nothing published here yet.</p>
        ) : (
          <>
            <Eyebrow>
              {posts.length} post{posts.length === 1 ? "" : "s"}
            </Eyebrow>
            <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
