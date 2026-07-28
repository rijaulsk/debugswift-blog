import type { ArbitraryTypedObject, PortableTextBlock } from "@portabletext/types";

/* A body is a mix of text blocks and custom object blocks (figure, faqBlock,
 * stepsBlock, comparisonTable, serviceLink, sourcedStat, codeBlock — see
 * sanity/schemaTypes/blocks.ts). PortableTextBlock alone requires `children`,
 * which none of the object blocks have, so the union is the honest type.
 * @portabletext/react accepts exactly this shape. */
export type BodyBlock = PortableTextBlock | ArbitraryTypedObject;

/* The shape every page in this app renders.
 *
 * Deliberately NOT the shape Sanity returns. Two things produce these objects:
 * the GROQ projections in sanity/lib/queries.ts, and the local content in
 * content/ that keeps the app runnable before any account exists (lib/env.ts).
 * Both must satisfy the same contract, so a page component never asks where its
 * data came from — and swapping the source can never quietly change the markup. */

export type ImageRef = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Cloudinary public_id when the asset came from the media library. Absent for
   *  the local /public images used before Cloudinary is connected. */
  publicId?: string;
};

export type Link = { label: string; url: string };

export type FaqItem = { question: string; answer: string };

/** The spoken version of a post. Null when none has been produced. */
export type PostAudio = {
  url: string;
  durationSeconds: number | null;
  /** Shown to the reader. A synthetic voice is disclosed, never passed off. */
  voice: string | null;
  generatedAt: string | null;
};

export type Author = {
  slug: string;
  name: string;
  /** "Founder", "Guest contributor" — a role, never an invented credential. */
  role: string;
  bio: string;
  links: Link[];
  /** Guest bylines get rel="nofollow ugc" on every outbound link. */
  isGuest: boolean;
  /** Null until a real photograph of a real person exists. The honesty rules
   *  forbid stock and generated faces; see E:\debugswift\lib\team.ts. */
  photo: ImageRef | null;
};

export type Topic = {
  slug: string;
  title: string;
  description: string;
  /** The pillar body. Its presence is what makes /topics/<slug> a page worth
   *  ranking rather than a filtered list. */
  pillar: BodyBlock[] | null;
  cover: ImageRef | null;
  /** Main-site service slug this topic maps to, e.g. "ai-automation". Drives
   *  the services ↔ blog link that every topic hub owes. */
  serviceSlug: string | null;
};

export type Post = {
  slug: string;
  title: string;
  /** ≤160 chars. Meta description and card copy. */
  excerpt: string;
  /** 40–60 words answering the title's question directly, rendered high on the
   *  page. The single highest-leverage field for featured snippets and for
   *  being quotable by an answer engine. Required — see the schema. */
  shortAnswer: string;
  keyTakeaways: string[];
  body: BodyBlock[];
  cover: ImageRef | null;
  /** ISO 8601. */
  publishedAt: string;
  /** ISO 8601, or null when never revised. Drives dateModified and sitemap lastmod. */
  updatedAt: string | null;
  topic: Topic | null;
  author: Author;
  faqs: FaqItem[];
  /** Attributable references. Models cite what carries provenance. */
  sources: Link[];
  audio: PostAudio | null;
  isGuest: boolean;
  noindex: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  readingMinutes: number;
};

/** Index/card projection — everything a listing needs and nothing it doesn't. */
export type PostCard = Pick<
  Post,
  "slug" | "title" | "excerpt" | "cover" | "publishedAt" | "updatedAt" | "topic" | "author" | "readingMinutes" | "isGuest"
>;
