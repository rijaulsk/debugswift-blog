import { blogUrl, SITE_URL, siteUrl } from "@/lib/links";
import { collectFaqs, collectSteps, toPlainText, type StepList } from "@/lib/portableText";
import { cloudinaryUrl } from "@/sanity/lib/cloudinary";
import type { Author, FaqItem, Post, PostCard, Topic } from "@/lib/types";

/**
 * The share card for a post.
 *
 * THE GENERATED CARD WINS, even when the post has a photograph, and that is
 * deliberate rather than an oversight.
 *
 * A share card is read as a thumbnail — a couple of hundred pixels wide in a
 * WhatsApp reply or a LinkedIn feed. At that size the post's own title is the
 * only thing that tells anyone what they are about to open. An abstract still
 * life, however good, says nothing there; cropped to 1.91:1 it usually says
 * less. So /blog/og/<slug> carries the title, and the cover photograph does the
 * job it is actually good at, which is being the image ON the page.
 *
 * This inverted on 23 Aug 2026, when `npm run cover` made photographs likely.
 * Before that, covers were rare and the order hardly mattered.
 *
 * The remaining fallbacks are for shapes that have no post to describe: a local
 * /public cover from before the media library, then the site card.
 */
export function ogImageFor(post: Pick<Post, "cover" | "slug">): {
  url: string;
  width: number;
  height: number;
  alt?: string;
} {
  if (post.slug) {
    return {
      url: blogUrl(`/og/${post.slug}`),
      width: 1200,
      height: 630,
      alt: "DebugSwift — Debugging businesses swiftly.",
    };
  }
  if (post.cover?.publicId) {
    return {
      url: cloudinaryUrl(post.cover.publicId, { width: 1200, height: 630 }),
      width: 1200,
      height: 630,
      alt: post.cover.alt,
    };
  }
  if (post.cover) {
    return {
      url: `${SITE_URL}/blog${post.cover.src}`,
      width: post.cover.width,
      height: post.cover.height,
      alt: post.cover.alt,
    };
  }
  return {
    url: blogUrl("/og.png"),
    width: 1200,
    height: 630,
    alt: "DebugSwift — Debugging businesses swiftly.",
  };
}

/* Structured data.
 *
 * Every builder here emits nodes that reference the two @ids declared in
 * app/layout.tsx — https://debugswift.com/#org and /#website. That is what makes
 * two deployments describe one company instead of two: the blog is served from a
 * different origin, so nothing about the main site's markup is present in these
 * documents, and a `publisher` written out longhand in each post would drift
 * from the main site's the first time either changed.
 *
 * Nothing here invents a value. Every field is either content an author wrote,
 * a date the CMS recorded, or a URL this file computed. */

type JsonLdNode = Record<string, unknown>;

const ORG = { "@id": `${SITE_URL}/#org` };
const WEBSITE = { "@id": `${SITE_URL}/#website` };

export function breadcrumbJsonLd(
  trail: { name: string; url: string }[],
): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function personJsonLd(author: Author): JsonLdNode {
  return {
    "@type": "Person",
    "@id": `${blogUrl(`/authors/${author.slug}`)}#person`,
    name: author.name,
    url: blogUrl(`/authors/${author.slug}`),
    jobTitle: author.role,
    description: author.bio,
    ...(author.photo ? { image: author.photo.src } : {}),
    ...(author.links.length ? { sameAs: author.links.map((l) => l.url) } : {}),
    ...(author.isGuest ? {} : { worksFor: ORG }),
  };
}

export function faqPageJsonLd(faqs: FaqItem[]): JsonLdNode | null {
  if (!faqs.length) return null;
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function howToJsonLd(list: StepList, post: Post): JsonLdNode {
  return {
    "@type": "HowTo",
    name: list.title || post.title,
    step: list.steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.title,
      ...(step.text ? { text: step.text } : {}),
    })),
  };
}

export function blogPostingJsonLd(post: Post): JsonLdNode {
  const url = blogUrl(`/${post.slug}`);
  const words = toPlainText(post.body).split(/\s+/).filter(Boolean).length;

  return {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    /* Google truncates headline at ~110 characters; the schema field is
     * required to match the visible H1, so this is a hard cap on the title
     * itself (enforced at 90 in the schema) rather than a place to trim. */
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    ...(post.cover ? { image: [post.cover.src] } : {}),
    datePublished: post.publishedAt,
    /* Falls back to publishedAt rather than "now": a dateModified that moves on
     * every build is the freshness-gaming signal that gets a site discounted. */
    dateModified: post.updatedAt ?? post.publishedAt,
    author: {
      "@type": "Person",
      name: post.author.name,
      url: blogUrl(`/authors/${post.author.slug}`),
    },
    publisher: ORG,
    isPartOf: WEBSITE,
    ...(post.topic ? { articleSection: post.topic.title } : {}),
    wordCount: words,
    inLanguage: "en",
    isAccessibleForFree: true,
    /* The short answer is the passage worth reading aloud and the passage worth
     * quoting — the same 40–60 words either way. */
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["#short-answer"],
    },
    /* A real recording of the article, declared as such. This is what lets a
     * voice assistant or a podcast-style surface play the post rather than
     * synthesise its own reading of the page, and it is a genuine
     * differentiator: almost nothing in this space ships one. */
    ...(post.audio
      ? {
          audio: {
            "@type": "AudioObject",
            contentUrl: post.audio.url,
            encodingFormat: "audio/mpeg",
            name: `${post.title} — spoken version`,
            ...(post.audio.durationSeconds
              ? { duration: `PT${Math.round(post.audio.durationSeconds)}S` }
              : {}),
            ...(post.audio.generatedAt ? { uploadDate: post.audio.generatedAt } : {}),
          },
        }
      : {}),
  };
}

export function collectionPageJsonLd({
  name,
  description,
  url,
  posts,
}: {
  name: string;
  description: string;
  url: string;
  posts: PostCard[];
}): JsonLdNode {
  return {
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    name,
    description,
    url,
    isPartOf: WEBSITE,
    publisher: ORG,
    inLanguage: "en",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((post, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: blogUrl(`/${post.slug}`),
        name: post.title,
      })),
    },
  };
}

/** Everything a post page needs, in one @graph. */
export function postGraph(post: Post): JsonLdNode {
  const faqs = collectFaqs(post);
  const steps = collectSteps(post.body);

  const nodes: (JsonLdNode | null)[] = [
    blogPostingJsonLd(post),
    breadcrumbJsonLd(breadcrumbsFor(post)),
    faqPageJsonLd(faqs),
    ...steps.map((list) => howToJsonLd(list, post)),
    personJsonLd(post.author),
  ];

  return { "@context": "https://schema.org", "@graph": nodes.filter(Boolean) };
}

export function breadcrumbsFor(post: Post): { name: string; url: string }[] {
  const trail = [
    { name: "Home", url: siteUrl("/") },
    { name: "Blog", url: blogUrl("/") },
  ];
  if (post.topic) {
    trail.push({ name: post.topic.title, url: blogUrl(`/topics/${post.topic.slug}`) });
  }
  trail.push({ name: post.title, url: blogUrl(`/${post.slug}`) });
  return trail;
}

export function topicBreadcrumbs(topic: Topic): { name: string; url: string }[] {
  return [
    { name: "Home", url: siteUrl("/") },
    { name: "Blog", url: blogUrl("/") },
    { name: "Topics", url: blogUrl("/topics") },
    { name: topic.title, url: blogUrl(`/topics/${topic.slug}`) },
  ];
}

/** Serialisable <script> payload. */
export function jsonLdScript(data: unknown): string {
  /* "</script>" inside a JSON string would close the tag early — the one real
   * injection risk in inlined JSON-LD, and editors do paste HTML into fields. */
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
