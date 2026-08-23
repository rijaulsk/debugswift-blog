/* The house art direction, for anything that generates an image.
 *
 * TRANSCRIBED from debugswift-assets/IMAGE-PROMPTS.md in the main repo — the
 * Style Preamble (§"The Style Preamble") and the reject list (§9). That file is
 * the authority and lives in the other repo, so this is a copy for the same
 * reason lib/nav.ts is a copy of lib/services.ts: a CLI here cannot reach a
 * gitignored folder in a sibling checkout, and nothing detects the drift. If the
 * prompt book changes, change this too.
 *
 * The reject list is not decoration either. It is the checklist a human runs
 * against every generated image before attaching it, and `npm run cover` prints
 * it at the point of decision rather than trusting anyone to remember it.
 */

export const STYLE_PREAMBLE = [
  "Art direction for DebugSwift, an AI automation and software development agency",
  "whose tagline is 'debugging businesses swiftly'. Warm, editorial, confident,",
  "hand-made — not techy, not corporate, not stocky. Palette is warm and restrained:",
  "backgrounds are cream #F7F3EB and sand #ECE7DF (never white, never grey); primary",
  "accent is a soft indigo #6467F2 with lighter indigo #ABB6FE and deep indigo #22206B;",
  "the single warm accent is a muted terracotta clay #E87D4A, used sparingly (one small",
  "moment per image, never a wash); ink text colour is a warm near-black #221D17, never",
  "pure black. Matte finish, soft natural light from one side, gentle long shadows, a",
  "faint paper/film grain. Flat and tactile, with real materiality — like risograph or a",
  "well-printed magazine, not glossy 3D. Generous negative space, asymmetric composition,",
  "one clear focal point. No gradient meshes, no neon, no glassmorphism, no floating 3D",
  "blobs, no lens flare, no HUD/sci-fi UI, no blue corporate tech clichés.",
].join(" ");

/* Appended to every prompt. Two of these are honesty rules rather than taste:
 * no people, and no readable text. A generated face is the "never invent a
 * person" rule broken in pixels, and baked-in lettering is a claim nobody
 * wrote — real type gets set in the page. */
export const NEGATIVE_DIRECTION = [
  "Still life only. No people, no faces, no hands, no figures of any kind.",
  "No readable text, no lettering, no logos, no watermarks, no UI screenshots.",
  "Photographic still life on a desk or tabletop, shot from above or at a low angle.",
].join(" ");

/** §9 of the prompt book. Printed before anyone attaches an image. */
export const REJECT_LIST = [
  "Pure white or cold grey background (must be cream/sand/warm)",
  "Blue/teal tech palette, neon, glow edges, holograms, HUD/sci-fi chrome",
  "A dense motherboard/circuit-board texture (the motif is faint and airy)",
  "Gradient mesh, aurora, glassmorphism, glossy 3D blobs, floating shapes, lens flare",
  "A human face, or any person",
  "Any readable fake text or logo baked in",
  "Clay used as more than one small moment",
  "Dead-centre symmetry with no negative space",
];

/**
 * Build the subject line from what the post is actually about.
 *
 * Deliberately literal: the title and topic, as objects on a desk. A prompt that
 * tries to be clever about metaphor produces the stock-photo abstraction the
 * style preamble spends a paragraph banning.
 */
export function subjectFor(title: string, topic: string | null): string {
  const t = title.replace(/[?.!]+$/, "");
  return [
    `The subject is a business owner's desk, arranged to suggest: "${t}".`,
    topic ? `The theme is ${topic.toLowerCase()}.` : "",
    "Use ordinary, real objects — paper, notebooks, a pen, printed sheets, a phone face",
    "down, envelopes, index cards, a mug — arranged with intent, not clutter.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildPrompt(title: string, topic: string | null): string {
  return `${STYLE_PREAMBLE}\n\n${subjectFor(title, topic)}\n\n${NEGATIVE_DIRECTION}`;
}
