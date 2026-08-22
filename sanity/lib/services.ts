/* The services a serviceLink may point at, in nav order, plus the Lead Engine.
 *
 * This lives in its own module, apart from schemaTypes/blocks.ts, for one
 * practical reason: blocks.ts imports `sanity`, and the CLI scripts
 * (check-content, push) need the slug list without dragging the entire Studio
 * into a node process.
 *
 * The eleven service slugs must agree with lib/nav.ts, which is itself the
 * hand-maintained four-field copy of E:\debugswift\lib\services.ts. Nothing
 * detects the drift — rename a service there and all three change together. */

export const SERVICE_SLUGS = [
  "ai-automation",
  "ai-integration",
  "business-process-automation",
  "web-apps-saas",
  "web-app-development",
  "conversion-websites",
  "landing-pages-ad-campaigns",
  "seo-local-lead-gen",
  "brand-design-systems",
  "ecommerce",
  "technical-consulting",
  "lead-engine",
] as const;

export type ServiceSlug = (typeof SERVICE_SLUGS)[number];

/** Studio dropdown labels. The blog's own nav copy lives in lib/nav.ts; these
 *  are editor-facing, so they carry the full service name. */
export const SERVICE_TITLES: Record<ServiceSlug, string> = {
  "ai-automation": "AI Automation & Chatbots",
  "ai-integration": "AI Integration",
  "business-process-automation": "Business Process Automation",
  "web-apps-saas": "Custom Web Apps & SaaS",
  "web-app-development": "Web & App Development",
  "conversion-websites": "Conversion Websites",
  "landing-pages-ad-campaigns": "Landing Pages & Ad Campaigns",
  "seo-local-lead-gen": "SEO & Local Visibility",
  "brand-design-systems": "Brand & Design Systems",
  ecommerce: "E-commerce",
  "technical-consulting": "Technical Consulting",
  "lead-engine": "The Lead Engine (flagship)",
};

/* What a TOPIC may map to. The Lead Engine is a product page, not a service, so
 * a topic hub never points at it — a serviceLink block inside a post still can.
 * Derived rather than retyped, so the two lists cannot drift apart. */
export const TOPIC_SERVICE_SLUGS = SERVICE_SLUGS.filter(
  (slug) => slug !== "lead-engine",
) as readonly Exclude<ServiceSlug, "lead-engine">[];

export function isServiceSlug(value: unknown): value is ServiceSlug {
  return typeof value === "string" && (SERVICE_SLUGS as readonly string[]).includes(value);
}
