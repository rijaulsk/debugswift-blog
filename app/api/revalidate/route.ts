import { revalidatePath } from "next/cache";
import { REVALIDATE_SECRET } from "@/lib/env";

/* Sanity webhook → instant republish, at /blog/api/revalidate.
 *
 * Without this, a post published in the Studio waits for the next deploy or an
 * ISR timer. With it, publishing is live in seconds and every page stays fully
 * static in between — no revalidate interval quietly re-rendering pages nobody
 * asked for.
 *
 * Point the webhook at the VERCEL origin directly
 * (https://debugswift-blog.vercel.app/blog/api/revalidate), not at
 * debugswift.com/blog/... — a webhook has no reason to take the proxy hop, and
 * routing it through the main deployment makes an outage there an outage here.
 *
 * Auth is a shared secret compared in constant time. A webhook endpoint that
 * anyone can call is a free cache-flush button, which is a denial-of-service
 * primitive rather than a vulnerability — but it costs one header to close. */

export const runtime = "nodejs";
/* Must not be cached: a cached revalidation endpoint revalidates nothing. */
export const dynamic = "force-dynamic";

/** Length-independent comparison, so a wrong secret leaks no timing signal. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request: Request) {
  if (!REVALIDATE_SECRET) {
    /* Unconfigured is not the same as unauthorised, and saying so is what stops
     * an hour being spent debugging a webhook that was never going to work. */
    return Response.json(
      { revalidated: false, reason: "REVALIDATE_SECRET is not set on this deployment" },
      { status: 503 },
    );
  }

  const provided =
    request.headers.get("x-revalidate-secret") ??
    new URL(request.url).searchParams.get("secret") ??
    "";

  if (!safeEqual(provided, REVALIDATE_SECRET)) {
    return Response.json({ revalidated: false }, { status: 401 });
  }

  let slug: string | undefined;
  try {
    const body = (await request.json()) as { slug?: string | { current?: string } };
    slug = typeof body.slug === "string" ? body.slug : body.slug?.current;
  } catch {
    /* A webhook with no body is still a valid "something changed" signal. */
  }

  /* Layout-level revalidation of the root: a new post changes the index, the
   * pagination, its topic hub, its author page, the sitemap and both feeds.
   * Revalidating only the post itself would leave every one of those stale,
   * and enumerating them here would silently miss whichever one gets added
   * next. */
  revalidatePath("/", "layout");

  return Response.json({
    revalidated: true,
    slug: slug ?? null,
    at: new Date().toISOString(),
  });
}
