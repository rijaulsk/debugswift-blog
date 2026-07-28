/* Environment, in one place, with one deliberate rule.
 *
 * THE RULE: local content in content/ renders only when the Sanity project ID
 * is ABSENT. The moment a project ID exists, Sanity is the only source of
 * truth — an empty dataset renders an empty blog, loudly, rather than quietly
 * falling back to the seeded demo post and looking like it worked.
 *
 * This mirrors the main site's app/api/diagnosis/route.ts, which fails loudly
 * rather than reporting success for a lead it didn't deliver. Same principle:
 * a system that hides its own misconfiguration is worse than one that breaks. */

export const SANITY_PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim() || "";

export const SANITY_DATASET =
  process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";

/* Pinned, never "latest": an unpinned API version means Sanity can change the
 * query semantics under a build that used to pass. Bump deliberately. */
export const SANITY_API_VERSION =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION?.trim() || "2026-07-01";

/** Server-only. Used by the seed script and the guest-pitch endpoints. Never
 *  reaches the browser bundle — no NEXT_PUBLIC_ prefix, so Next won't inline it. */
export const SANITY_WRITE_TOKEN = process.env.SANITY_API_WRITE_TOKEN?.trim() || "";

/** Shared secret for the Sanity → /api/revalidate webhook. */
export const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET?.trim() || "";

export const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() || "";

/** True once a Sanity project exists. Gates the local-content fallback. */
export const IS_SANITY_CONFIGURED = SANITY_PROJECT_ID.length > 0;

/** True once Cloudinary exists. Until then, covers come from /public. */
export const IS_CLOUDINARY_CONFIGURED = CLOUDINARY_CLOUD_NAME.length > 0;
