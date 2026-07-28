import { createClient, type SanityClient } from "next-sanity";
import {
  IS_SANITY_CONFIGURED,
  SANITY_API_VERSION,
  SANITY_DATASET,
  SANITY_PROJECT_ID,
  SANITY_WRITE_TOKEN,
} from "@/lib/env";

/* createClient throws on an empty projectId, and this repo is designed to run
 * with no Sanity account at all until one exists — so the client is created
 * lazily and returns null rather than exploding at import time. Every caller
 * goes through lib/content.ts, which handles the null by using local content. */

let readClient: SanityClient | null = null;

export function getClient(): SanityClient | null {
  if (!IS_SANITY_CONFIGURED) return null;
  if (!readClient) {
    readClient = createClient({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET,
      apiVersion: SANITY_API_VERSION,
      /* useCdn:false is correct HERE and would be wrong in a client component.
       * Every read in this app happens on the server during static generation
       * or on-demand revalidation, where Next's own cache is doing the caching.
       * The Sanity CDN would add a second, staler layer underneath it — the
       * publish webhook would revalidate the page and then re-fetch the same
       * out-of-date document it was trying to replace. */
      useCdn: false,
      perspective: "published",
    });
  }
  return readClient;
}

/* Write client — server only, and only for documents the PUBLIC creates:
 * guest pitches and guest drafts. Never used to publish a post; that stays a
 * human action in the Studio.
 *
 * SANITY_API_WRITE_TOKEN has no NEXT_PUBLIC_ prefix, so Next will not inline it
 * into the browser bundle. Importing this module from a client component is a
 * build error, which is the intended guard rail. */
/**
 * Typed GROQ fetch. Use this instead of calling client.fetch directly.
 *
 * The reason is a genuinely nasty overload in @sanity/client v7. Its signature
 * is roughly:
 *
 *   fetch<R = Any, Q extends QueryWithoutParams | QueryParams = QueryParams>(
 *     query: G,
 *     params: Q extends QueryWithoutParams ? QueryWithoutParams : Q,
 *   )
 *
 * TypeScript does not infer the remaining type arguments once ANY of them is
 * supplied explicitly. So the natural-looking `client.fetch<Post | null>(query,
 * { slug })` leaves Q on its default, the conditional collapses to the
 * no-parameters branch, and the call fails with the memorable and completely
 * unhelpful "Type 'string' is not assignable to type 'never'".
 *
 * Passing both arguments fixes it, so this wrapper does that once rather than
 * at every call site — and every parameter this app sends is a string.
 */
export function groqFetch<R>(
  client: SanityClient,
  query: string,
  params: Record<string, string> = {},
): Promise<R> {
  return client.fetch<R, Record<string, string>>(query, params);
}

export function getWriteClient(): SanityClient | null {
  if (!IS_SANITY_CONFIGURED || !SANITY_WRITE_TOKEN) return null;
  return createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    useCdn: false,
    token: SANITY_WRITE_TOKEN,
  });
}
