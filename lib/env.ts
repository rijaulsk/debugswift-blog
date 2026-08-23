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

/* The fallback is for a FRESH CLONE, never for a deployment.
 *
 * content/ exists so this repo runs with no accounts at all. On a real
 * deployment that same helpfulness is a trap, and it sprang on 23 Aug 2026: the
 * blog went live at debugswift.com/blog with NEXT_PUBLIC_SANITY_PROJECT_ID unset,
 * so every page served the demo fixtures instead of the CMS. Nothing looked
 * wrong. The posts were there, the sitemap resolved, the feeds worked, every
 * URL returned 200 — because the fixtures are copies of the same three posts.
 * Publishing in the Studio changed nothing on the site and there was no symptom
 * to notice, only a Studio page quietly saying no project was connected.
 *
 * So: on Vercel, an unconfigured Sanity project is a BUILD FAILURE. That is the
 * same rule lib/content.ts already applies to an empty dataset, extended to the
 * case that actually happened. Better a deploy that stops with a sentence
 * telling you which variable is missing than one that succeeds and serves the
 * wrong content for a fortnight.
 *
 * Local development is untouched — no VERCEL, no throw, fixtures as before. */
if (process.env.VERCEL && !IS_SANITY_CONFIGURED && !process.env.BLOG_ALLOW_FIXTURES) {
  /* Print what this build can actually SEE before failing.
   *
   * The first version of this guard threw one sentence naming the variable, and
   * that was not enough: the variable was in the dashboard, the deploys failed
   * anyway, and there was no way to tell a missing value from a misspelled name
   * from the wrong environment. Names only, never values — a build log is not a
   * secret store. */
  const present = (name: string) => (process.env[name]?.trim() ? "set" : "MISSING");

  const report = [
    "",
    "  Environment this build can see:",
    `    VERCEL_ENV                          ${process.env.VERCEL_ENV ?? "(none)"}`,
    `    NEXT_PUBLIC_SANITY_PROJECT_ID       ${present("NEXT_PUBLIC_SANITY_PROJECT_ID")}`,
    `    NEXT_PUBLIC_SANITY_DATASET          ${present("NEXT_PUBLIC_SANITY_DATASET")}`,
    `    NEXT_PUBLIC_SANITY_API_VERSION      ${present("NEXT_PUBLIC_SANITY_API_VERSION")}`,
    `    SANITY_API_WRITE_TOKEN              ${present("SANITY_API_WRITE_TOKEN")}`,
    `    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME   ${present("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME")}`,
    `    REVALIDATE_SECRET                   ${present("REVALIDATE_SECRET")}`,
  ];

  /* The mistake most likely to have been made here, because this repo's own
   * GitHub Actions workflow calls its SECRET "SANITY_PROJECT_ID" and maps it to
   * the prefixed name. Copying that naming into Vercel produces exactly this:
   * a variable that is present, correct, and invisible to the app. */
  const unprefixed = [
    ["SANITY_PROJECT_ID", "NEXT_PUBLIC_SANITY_PROJECT_ID"],
    ["SANITY_DATASET", "NEXT_PUBLIC_SANITY_DATASET"],
    ["SANITY_API_VERSION", "NEXT_PUBLIC_SANITY_API_VERSION"],
    ["CLOUDINARY_CLOUD_NAME", "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"],
  ].filter(([wrong, right]) => process.env[wrong]?.trim() && !process.env[right]?.trim());

  if (unprefixed.length) {
    report.push(
      "",
      "  FOUND THE PROBLEM — these are set under the wrong name:",
      ...unprefixed.map(([wrong, right]) => `    ${wrong}  ->  rename to  ${right}`),
      "",
      "  The NEXT_PUBLIC_ prefix is not decoration. Next inlines those values into",
      "  the browser bundle at build time, and the Studio runs in the browser, so a",
      "  variable without the prefix is invisible to it however correct the value is.",
    );
  }

  report.push(
    "",
    "  If the names are right, check the ENVIRONMENT column in Vercel: a variable",
    "  ticked only for Preview is missing from a Production build. Values are read",
    "  when the build runs, so changing one needs a redeploy, not a restart.",
    "",
    "  To ship anyway, knowing the site will serve the demo fixtures in content/",
    "  rather than the CMS, set BLOG_ALLOW_FIXTURES=1. Nothing else overrides this.",
    "",
  );

  console.error(report.join("\n"));

  throw new Error(
    "NEXT_PUBLIC_SANITY_PROJECT_ID is not set on this deployment.\n\n" +
      "Without it the blog silently serves the demo content in content/ instead of the\n" +
      "CMS: every page renders, every URL returns 200, and nothing published in the\n" +
      "Studio ever appears. See the environment report printed above.",
  );
}

/** True once Cloudinary exists. Until then, covers come from /public. */
export const IS_CLOUDINARY_CONFIGURED = CLOUDINARY_CLOUD_NAME.length > 0;
