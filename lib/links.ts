/* URL constants for a repo that is served under a basePath.
 *
 * Two different kinds of "internal" exist here and confusing them is how this
 * app breaks:
 *
 *   MAIN-SITE paths  — /services, /about, /contact … live in the OTHER repo
 *                      (E:\debugswift). They must be plain <a> hrefs, because
 *                      next/link would prefix basePath and send them to
 *                      /blog/services, which does not exist.
 *   BLOG paths       — the routes in this repo. Written WITHOUT the /blog
 *                      prefix and passed to next/link, which adds it.
 *
 * Anything that has to be an absolute URL (canonicals, JSON-LD, sitemaps,
 * feeds, OG images) uses the helpers below rather than hand-built strings —
 * Next does not apply basePath to metadata, so hand-built ones silently lose
 * the /blog segment. */

export const SITE_URL = "https://debugswift.com";

/** The basePath, duplicated from next.config.ts on purpose: metadata routes
 *  need it as a value and cannot read the config. */
export const BLOG_BASE = "/blog";

/** Absolute URL for a BLOG route. Pass the path as next/link sees it ("/",
 *  "/some-post"), not with /blog already on the front. */
export function blogUrl(path = "/"): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${BLOG_BASE}${clean}`;
}

/** Absolute URL for a MAIN-SITE page ("/services/ai-automation"). */
export function siteUrl(path = "/"): string {
  return `${SITE_URL}${path === "/" ? "" : path}`;
}

/** Canonical path for post metadata. Next resolves `alternates.canonical`
 *  against metadataBase and does NOT add basePath, so this must carry it. */
export function canonicalPath(path = "/"): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${BLOG_BASE}${clean}` || "/";
}

/* Main-site destinations referenced from blog chrome and post CTAs. Kept in one
 * place so a route rename on the main site is a one-file fix here. */
export const MAIN = {
  home: "/",
  services: "/services",
  about: "/about",
  contact: "/contact",
  diagnosis: "/contact#diagnosis",
  leadEngine: "/lead-engine",
  tools: "/tools",
  privacy: "/privacy",
  terms: "/terms",
  sitemap: "/sitemap",
  service: (slug: string) => `/services/${slug}`,
} as const;

/* Client-side fetch targets.
 *
 * These carry the /blog prefix explicitly, and must. basePath is applied by
 * next/link and the router; fetch() is a browser API that knows nothing about
 * Next, so fetch("/api/pitch") from a page served at /blog/write-for-us hits
 * debugswift.com/api/pitch — the MAIN site, which has no such route. */
export const API = {
  pitch: `${BLOG_BASE}/api/pitch`,
  draft: `${BLOG_BASE}/api/draft`,
} as const;

/* Blog destinations, as next/link wants them (no /blog prefix). */
export const BLOG = {
  home: "/",
  post: (slug: string) => `/${slug}`,
  topics: "/topics",
  topic: (slug: string) => `/topics/${slug}`,
  author: (slug: string) => `/authors/${slug}`,
  page: (n: number) => (n <= 1 ? "/" : `/page/${n}`),
  search: "/search",
  writeForUs: "/write-for-us",
} as const;
