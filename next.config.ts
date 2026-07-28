import type { NextConfig } from "next";

/* This app is served at debugswift.com/blog through a reverse proxy from the
 * MAIN repo (E:\debugswift), whose next.config.ts holds a `beforeFiles` rewrite
 * for /blog and /blog/:path* that activates when BLOG_ORIGIN is set.
 *
 * basePath is therefore NOT optional. Every page, every /_next/* asset, and
 * every metadata route has to live under /blog or the proxied URLs and the
 * asset paths disagree and the site loads naked HTML.
 *
 * The cost of basePath, and the single most likely defect in this repo:
 * next/link silently prefixes /blog onto every href. The Header and Footer link
 * to pages that live in the MAIN app (/services, /about, /contact …), and as
 * <Link> those become /blog/services and 404. See components/MainSiteLink.tsx —
 * main-site links are bare <a>, next/link is for blog routes only. */

type SlugRedirect = { source: string; destination: string; permanent: true };
type PostRedirect = { slug: string; redirectsFrom?: string[] };

/**
 * Slug-change 301s, generated at build time from each post's redirectsFrom[].
 *
 * Renaming a published post is normally how a blog throws away the only thing
 * it spent months earning — every inbound link and every accumulated ranking
 * signal points at the old URL. Registering the old slug on the document makes
 * the rename safe and keeps the record next to the content.
 *
 * Written inline rather than imported from lib/: Next compiles this file to a
 * standalone next.config.compiled.js, and a relative import out of it resolves
 * against the compiled file's location with no extension, which fails at
 * runtime. A config that can fail to import is a config that can break `build`.
 *
 * Plain fetch rather than @sanity/client for the same reason — no path aliases,
 * no module graph, nothing to resolve. A network failure degrades to "no
 * redirects" rather than a failed build: the posts still resolve at their
 * current slugs, which is the safe direction to fail in.
 */
async function slugRedirects(): Promise<SlugRedirect[]> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  const apiVersion =
    process.env.NEXT_PUBLIC_SANITY_API_VERSION?.trim() || "2026-07-01";

  if (!projectId) return [];

  const query = `*[_type == "post" && defined(redirectsFrom) && count(redirectsFrom) > 0]{ "slug": slug.current, redirectsFrom }`;
  const url = `https://${projectId}.apicdn.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}`;

  let posts: PostRedirect[] = [];
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as { result?: PostRedirect[] };
    posts = json.result ?? [];
  } catch {
    return [];
  }

  const redirects: SlugRedirect[] = [];
  const seen = new Set<string>();

  for (const post of posts) {
    for (const from of post.redirectsFrom ?? []) {
      const source = `/${from.replace(/^\/+/, "")}`;
      /* A slug can only redirect once, and never to itself — either would
       * produce a loop that takes the post offline. */
      if (source === `/${post.slug}` || seen.has(source)) continue;
      seen.add(source);
      redirects.push({ source, destination: `/${post.slug}`, permanent: true });
    }
  }

  return redirects;
}

const nextConfig: NextConfig = {
  basePath: "/blog",

  images: {
    remotePatterns: [
      /* Post media. Cloudinary is the media library (chosen 28 Jul 2026);
       * cdn.sanity.io stays allowed because the Studio can still host an
       * uploaded asset and we don't want a broken image if one slips in. */
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "cdn.sanity.io" },
    ],
  },

  async redirects() {
    return [
      /* The root of THIS deployment.
       *
       * basePath means this app serves nothing at "/", so hitting the origin
       * root produced a 404 — confusing in local dev (localhost:3000 looks
       * broken until you remember to type /blog) and wrong on the raw Vercel
       * origin, which has no reason to be a dead end.
       *
       * In production nobody reaches this: debugswift.com/ is the main site and
       * only /blog/* is proxied here. So it costs nothing and fixes both of the
       * places it does show up.
       *
       * basePath:false is required — without it Next would prefix the source
       * and this would mean /blog -> /blog/blog. Temporary rather than
       * permanent: the origin root is not a canonical URL and a 308 would sit
       * in browser caches long after any change to this setup. */
      { source: "/", destination: "/blog", permanent: false, basePath: false as const },
      ...(await slugRedirects()),
    ];
  },
};

export default nextConfig;
