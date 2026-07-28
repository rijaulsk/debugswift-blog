import { groq } from "next-sanity";

/* GROQ projections.
 *
 * Kept as narrow as each page actually needs. A blog index that fetches every
 * post's full body is the classic way to make a fast framework slow — the card
 * projection below deliberately has no `body` in it.
 *
 * Cover images come back as the RAW cloudinary.asset object plus its alt field;
 * turning that pair into an ImageRef is sanity/lib/cloudinary.ts's job, so the
 * URL-building rules live in one place instead of being spread through GROQ. */

const authorProjection = groq`
  "slug": slug.current,
  name,
  role,
  bio,
  isGuest,
  links[]{ label, url },
  photo,
  photoAlt
`;

const topicProjection = groq`
  "slug": slug.current,
  title,
  description,
  serviceSlug,
  cover,
  coverAlt
`;

/** Listing shape — no body, no FAQs, no sources. */
export const postCardProjection = groq`
  "slug": slug.current,
  title,
  excerpt,
  publishedAt,
  updatedAt,
  cover,
  coverAlt,
  "isGuest": author->isGuest,
  topic->{ ${topicProjection}, "pillar": null },
  author->{ ${authorProjection} },
  /* Character count, not word count: pt::text() flattens the body to a string
   * and length() measures a string in characters. Cards don't fetch the body
   * (that's the point of this projection), so reading time is estimated from
   * this — see readingMinutesFromChars in lib/portableText.ts. */
  "charCount": length(pt::text(body))
`;

/** Full post, everything a detail page and the markdown export need. */
export const postProjection = groq`
  ${postCardProjection},
  shortAnswer,
  keyTakeaways,
  body,
  faqs[]{ question, answer },
  sources[]{ label, url },
  audio{ url, durationSeconds, voice, generatedAt },
  seoTitle,
  seoDescription,
  noindex
`;

/* NOTE the deliberately unbalanced bracket: this fragment opens the filter and
 * each query below closes it, so they can append their own conditions. Adding
 * the "]" here would make `${publicPosts} && noindex != true]` a syntax error.
 *
 * `!(_id in path("drafts.**"))` is belt and braces — the read client already
 * uses perspective:"published" — but it costs nothing and means a query pasted
 * into Vision does the same thing the site does. */
const publicPosts = groq`*[_type == "post" && defined(slug.current) && !(_id in path("drafts.**"))`;

export const allPostCardsQuery = groq`
  ${publicPosts}] | order(publishedAt desc) {
    ${postCardProjection}
  }
`;

export const indexPostsQuery = groq`
  ${publicPosts} && noindex != true] | order(publishedAt desc) {
    ${postCardProjection}
  }
`;

export const postBySlugQuery = groq`
  ${publicPosts} && slug.current == $slug][0] {
    ${postProjection}
  }
`;

export const postSlugsQuery = groq`
  ${publicPosts}] { "slug": slug.current, publishedAt, updatedAt, noindex }
`;

export const postsByTopicQuery = groq`
  ${publicPosts} && topic->slug.current == $slug && noindex != true] | order(publishedAt desc) {
    ${postCardProjection}
  }
`;

export const postsByAuthorQuery = groq`
  ${publicPosts} && author->slug.current == $slug && noindex != true] | order(publishedAt desc) {
    ${postCardProjection}
  }
`;

export const allTopicsQuery = groq`
  *[_type == "topic" && defined(slug.current)] | order(order asc, title asc) {
    ${topicProjection},
    "postCount": count(*[_type == "post" && references(^._id) && noindex != true])
  }
`;

export const topicBySlugQuery = groq`
  *[_type == "topic" && slug.current == $slug][0] {
    ${topicProjection},
    "pillar": pillar
  }
`;

export const authorBySlugQuery = groq`
  *[_type == "author" && slug.current == $slug][0] { ${authorProjection} }
`;

export const settingsQuery = groq`
  *[_type == "siteSettings"][0] {
    title,
    lede,
    description,
    featuredPost->{ "slug": slug.current }
  }
`;

/** Guest pipeline: validate an invite token without exposing the whole document.
 *
 * Annotated `: string` deliberately. next-sanity's `groq` tag returns a branded
 * literal type for templates with no interpolation, which client.fetch resolves
 * through its typed-query map to the "this query takes no parameters" overload —
 * and then rejects `{ token }` with "Type 'string' is not assignable to type
 * 'never'". Every other query in this file interpolates a fragment and so comes
 * out as a plain string by accident. This repo does not run Sanity typegen, so
 * the branding buys nothing and the annotation costs nothing. */
export const pitchByTokenQuery: string = groq`
  *[_type == "guestPitch" && inviteToken == $token][0] {
    _id,
    name,
    email,
    topicIdea,
    status,
    inviteExpires
  }
`;
