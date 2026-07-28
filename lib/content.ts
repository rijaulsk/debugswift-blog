import { getClient, groqFetch } from "@/sanity/lib/client";
import { resolveCover, type CloudinaryAsset } from "@/sanity/lib/cloudinary";
import {
  allTopicsQuery,
  authorBySlugQuery,
  indexPostsQuery,
  postBySlugQuery,
  postSlugsQuery,
  postsByAuthorQuery,
  postsByTopicQuery,
  settingsQuery,
  topicBySlugQuery,
} from "@/sanity/lib/queries";
import { localAuthors, localPosts, localSettings, localTopics } from "@/content";
import { IS_SANITY_CONFIGURED } from "@/lib/env";
import { readingMinutes, readingMinutesFromChars } from "@/lib/portableText";
import type { Author, Post, PostCard, Topic } from "@/lib/types";

/* The one seam between "where content lives" and "how it renders".
 *
 * THE RULE, and it is the whole reason this file exists:
 *
 *   Local content in content/ is used ONLY when Sanity is unconfigured. The
 *   moment NEXT_PUBLIC_SANITY_PROJECT_ID has a value, Sanity is the sole source
 *   of truth and an empty dataset produces an empty blog.
 *
 * The tempting alternative -- fall back whenever Sanity returns nothing -- is a
 * trap. A typo'd dataset name, an expired token or a botched deploy would all
 * render the seeded demo post and look completely healthy, and the failure
 * would only surface when someone noticed the site was months out of date.
 * Same principle as the main site's app/api/diagnosis/route.ts, which fails
 * loudly rather than reporting success for a lead it never delivered.
 *
 * Every function below returns the app's own types (lib/types.ts), so no page
 * component can tell which source it got.
 *
 * Reads go through groqFetch rather than client.fetch directly -- see the note
 * on that helper in sanity/lib/client.ts for the overload it works around. */

/* ---- Sanity -> app types ------------------------------------------------ */

type RawAuthor = {
  slug: string;
  name: string;
  role: string;
  bio: string;
  isGuest?: boolean;
  links?: { label: string; url: string }[] | null;
  photo?: CloudinaryAsset | null;
  photoAlt?: string | null;
};

type RawTopic = {
  slug: string;
  title: string;
  description: string;
  serviceSlug?: string | null;
  cover?: CloudinaryAsset | null;
  coverAlt?: string | null;
  pillar?: Post["body"] | null;
};

type RawPost = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  updatedAt?: string | null;
  cover?: CloudinaryAsset | null;
  coverAlt?: string | null;
  isGuest?: boolean;
  topic?: RawTopic | null;
  author?: RawAuthor | null;
  charCount?: number;
  shortAnswer?: string;
  keyTakeaways?: string[] | null;
  body?: Post["body"];
  faqs?: { question: string; answer: string }[] | null;
  sources?: { label: string; url: string }[] | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  noindex?: boolean;
};

/* A post whose author reference was deleted still has to render rather than
 * crash the whole index. The agency name is the honest label -- never a
 * made-up person. */
const UNKNOWN_AUTHOR: Author = {
  slug: "debugswift",
  name: "DebugSwift",
  role: "Team",
  bio: "",
  links: [],
  isGuest: false,
  photo: null,
};

function mapAuthor(raw: RawAuthor | null | undefined): Author {
  if (!raw) return UNKNOWN_AUTHOR;
  return {
    slug: raw.slug,
    name: raw.name,
    role: raw.role,
    bio: raw.bio,
    links: raw.links ?? [],
    isGuest: Boolean(raw.isGuest),
    photo: resolveCover(raw.photo, raw.photoAlt ?? raw.name),
  };
}

function mapTopic(raw: RawTopic | null | undefined): Topic | null {
  if (!raw) return null;
  return {
    slug: raw.slug,
    title: raw.title,
    description: raw.description,
    pillar: raw.pillar ?? null,
    cover: resolveCover(raw.cover, raw.coverAlt),
    serviceSlug: raw.serviceSlug ?? null,
  };
}

function mapCard(raw: RawPost): PostCard {
  return {
    slug: raw.slug,
    title: raw.title,
    excerpt: raw.excerpt,
    cover: resolveCover(raw.cover, raw.coverAlt),
    publishedAt: raw.publishedAt,
    updatedAt: raw.updatedAt ?? null,
    topic: mapTopic(raw.topic),
    author: mapAuthor(raw.author),
    readingMinutes: readingMinutesFromChars(raw.charCount),
    isGuest: Boolean(raw.isGuest ?? raw.author?.isGuest),
  };
}

function mapPost(raw: RawPost): Post {
  const body = raw.body ?? [];
  return {
    ...mapCard(raw),
    shortAnswer: raw.shortAnswer ?? "",
    keyTakeaways: raw.keyTakeaways ?? [],
    body,
    faqs: raw.faqs ?? [],
    sources: raw.sources ?? [],
    noindex: Boolean(raw.noindex),
    seoTitle: raw.seoTitle ?? null,
    seoDescription: raw.seoDescription ?? null,
    /* The full body is in hand here, so measure it rather than estimating from
     * a character count the way a card has to. */
    readingMinutes: readingMinutes(body),
  };
}

const toCard = (post: Post): PostCard => ({
  slug: post.slug,
  title: post.title,
  excerpt: post.excerpt,
  cover: post.cover,
  publishedAt: post.publishedAt,
  updatedAt: post.updatedAt,
  topic: post.topic,
  author: post.author,
  readingMinutes: post.readingMinutes,
  isGuest: post.isGuest,
});

const byNewest = (a: { publishedAt: string }, b: { publishedAt: string }) =>
  Date.parse(b.publishedAt) - Date.parse(a.publishedAt);

/* ---- Public API --------------------------------------------------------- */

export type BlogSettings = {
  title: string;
  lede: string;
  description: string;
  featuredSlug: string | null;
};

export async function getSettings(): Promise<BlogSettings> {
  const client = getClient();
  if (!client) return localSettings;

  const raw = await groqFetch<{
    title?: string;
    lede?: string;
    description?: string;
    featuredPost?: { slug?: string } | null;
  } | null>(client, settingsQuery);

  /* Settings are chrome, not content -- falling back to the defaults when the
   * singleton hasn't been created yet doesn't hide a broken CMS, it just avoids
   * an empty <h1> on day one. */
  return {
    title: raw?.title || localSettings.title,
    lede: raw?.lede || localSettings.lede,
    description: raw?.description || localSettings.description,
    featuredSlug: raw?.featuredPost?.slug ?? null,
  };
}

/** Every post that may be listed. Excludes noindex posts. */
export async function getPostCards(): Promise<PostCard[]> {
  const client = getClient();
  if (!client) {
    return localPosts.filter((p) => !p.noindex).sort(byNewest).map(toCard);
  }
  const raw = await groqFetch<RawPost[]>(client, indexPostsQuery);
  return (raw ?? []).map(mapCard);
}

export async function getPost(slug: string): Promise<Post | null> {
  const client = getClient();
  if (!client) return localPosts.find((p) => p.slug === slug) ?? null;

  const raw = await groqFetch<RawPost | null>(client, postBySlugQuery, { slug });
  return raw ? mapPost(raw) : null;
}

/** Slugs + dates for generateStaticParams, the sitemap and the feeds. */
export async function getPostIndex(): Promise<
  { slug: string; publishedAt: string; updatedAt: string | null; noindex: boolean }[]
> {
  const client = getClient();
  if (!client) {
    return localPosts.map((p) => ({
      slug: p.slug,
      publishedAt: p.publishedAt,
      updatedAt: p.updatedAt,
      noindex: p.noindex,
    }));
  }
  const raw = await groqFetch<
    { slug: string; publishedAt: string; updatedAt?: string | null; noindex?: boolean }[]
  >(client, postSlugsQuery);
  return (raw ?? []).map((p) => ({
    slug: p.slug,
    publishedAt: p.publishedAt,
    updatedAt: p.updatedAt ?? null,
    noindex: Boolean(p.noindex),
  }));
}

/** Full posts -- used by llms-full.txt and the feeds, which need every body. */
export async function getAllPosts(): Promise<Post[]> {
  const client = getClient();
  if (!client) return [...localPosts].sort(byNewest);

  const index = await getPostIndex();
  const posts = await Promise.all(index.map((entry) => getPost(entry.slug)));
  return posts.filter((p): p is Post => p !== null).sort(byNewest);
}

export type TopicWithCount = Topic & { postCount: number };

export async function getTopics(): Promise<TopicWithCount[]> {
  const client = getClient();
  if (!client) {
    return localTopics.map((topic) => ({
      ...topic,
      postCount: localPosts.filter((p) => p.topic?.slug === topic.slug && !p.noindex).length,
    }));
  }
  const raw = await groqFetch<(RawTopic & { postCount?: number })[]>(client, allTopicsQuery);
  return (raw ?? []).map((t) => ({
    ...(mapTopic(t) as Topic),
    postCount: t.postCount ?? 0,
  }));
}

export async function getTopic(slug: string): Promise<Topic | null> {
  const client = getClient();
  if (!client) return localTopics.find((t) => t.slug === slug) ?? null;

  const raw = await groqFetch<RawTopic | null>(client, topicBySlugQuery, { slug });
  return mapTopic(raw);
}

export async function getPostsByTopic(slug: string): Promise<PostCard[]> {
  const client = getClient();
  if (!client) {
    return localPosts
      .filter((p) => p.topic?.slug === slug && !p.noindex)
      .sort(byNewest)
      .map(toCard);
  }
  const raw = await groqFetch<RawPost[]>(client, postsByTopicQuery, { slug });
  return (raw ?? []).map(mapCard);
}

export async function getAuthor(slug: string): Promise<Author | null> {
  const client = getClient();
  if (!client) return localAuthors.find((a) => a.slug === slug) ?? null;

  const raw = await groqFetch<RawAuthor | null>(client, authorBySlugQuery, { slug });
  return raw ? mapAuthor(raw) : null;
}

export async function getPostsByAuthor(slug: string): Promise<PostCard[]> {
  const client = getClient();
  if (!client) {
    return localPosts
      .filter((p) => p.author.slug === slug && !p.noindex)
      .sort(byNewest)
      .map(toCard);
  }
  const raw = await groqFetch<RawPost[]>(client, postsByAuthorQuery, { slug });
  return (raw ?? []).map(mapCard);
}

/** Author slugs for generateStaticParams. */
export async function getAuthorSlugs(): Promise<string[]> {
  if (!IS_SANITY_CONFIGURED) return localAuthors.map((a) => a.slug);
  const cards = await getPostCards();
  return [...new Set(cards.map((c) => c.author.slug))];
}

/**
 * Related posts: same topic first, newest elsewhere to fill.
 *
 * Always returns something. An empty "keep reading" block on a young blog is a
 * dead end, and a dead end is where a reader leaves.
 */
export async function getRelatedPosts(post: Post, limit = 3): Promise<PostCard[]> {
  const all = await getPostCards();
  const others = all.filter((p) => p.slug !== post.slug);
  const sameTopic = others.filter((p) => p.topic?.slug && p.topic.slug === post.topic?.slug);
  const rest = others.filter((p) => !sameTopic.includes(p));
  return [...sameTopic, ...rest].slice(0, limit);
}
