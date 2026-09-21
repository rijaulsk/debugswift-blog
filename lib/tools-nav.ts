/* Navigation-only slice of the tools catalogue.
 *
 * SOURCE OF TRUTH: E:\debugswift-tools\lib\tools.ts. Same arrangement as
 * lib/nav.ts beside it, which is a four-field slice of the main repo's
 * lib/services.ts: the three deployments share no package, so navigation data
 * is copied by hand, and the Tools dropdown has to render in every Header on
 * the domain.
 *
 * Same order, same strings verbatim. The check that guards it lives in the MAIN
 * repo and reaches across to this file — run `npm run check:nav` in
 * E:\debugswift after any rename, re-slug, reorder or navLine edit. Nothing in
 * THIS repo detects the drift.
 *
 * Only LIVE tools belong here. A "planned" tool in the registry deliberately
 * has no route, and a dropdown entry linking to a 404 is exactly the lie the
 * registry's status field exists to prevent.
 *
 * navLine has a ≤35-character budget: the dropdown renders it at 13px in a
 * narrow column and truncates rather than wraps. Do not exceed it here either. */

export type ToolGroupKey = "search" | "money" | "assets" | "diagnostics";

/** Group labels, in display order. Nine flat entries scan as a wall; four
 *  headed groups scan as a menu. */
export const toolGroups: { key: ToolGroupKey; label: string }[] = [
  { key: "search", label: "Search & visibility" },
  { key: "money", label: "Money & documents" },
  { key: "assets", label: "Assets" },
  { key: "diagnostics", label: "Diagnostics" },
];

export type NavTool = {
  slug: string;
  name: string;
  navLine: string;
  group: ToolGroupKey;
};

export const tools: NavTool[] = [
  {
    slug: "website-audit",
    name: "Website Audit",
    navLine: "34 checks on one page",
    group: "search",
  },
  {
    slug: "schema-generator",
    name: "Schema Generator",
    navLine: "Structured data for local search",
    group: "search",
  },
  {
    slug: "email-deliverability",
    name: "Email Deliverability Check",
    navLine: "SPF, DKIM and DMARC over DNS",
    group: "diagnostics",
  },
  {
    slug: "meta-generator",
    name: "Meta & Headline Generator",
    navLine: "Where Google cuts your title",
    group: "search",
  },
  {
    slug: "quote-generator",
    name: "Quote & Invoice Generator",
    navLine: "A printable quote or invoice",
    group: "money",
  },
  {
    slug: "brand-kit",
    name: "Brand Kit Generator",
    navLine: "One colour into a full palette",
    group: "assets",
  },
  {
    slug: "qr-generator",
    name: "QR Code Generator",
    navLine: "Vector QR with no redirect",
    group: "assets",
  },
  {
    slug: "image-compressor",
    name: "Image Compressor",
    navLine: "Shrinks photos on your device",
    group: "assets",
  },
  {
    slug: "project-scoper",
    name: "Project Scoper",
    navLine: "A vague idea into a brief",
    group: "money",
  },
];

/** The tools of one group, in registry order. The dropdown and the hub's filter
 *  chips both read through this so neither can invent an ordering. */
export function toolsInGroup(group: ToolGroupKey): NavTool[] {
  return tools.filter((t) => t.group === group);
}
