import { createClient } from "@sanity/client";
import { createHash } from "node:crypto";

import { loadDotEnvLocal } from "@/scripts/lib/env";

/* Generate the spoken version of a post.
 *
 *   npm run audio <slug>          one post
 *   npm run audio --all           every post that hasn't got audio yet
 *   npm run audio <slug> --force  regenerate one that already has it
 *
 * Pipeline: read the post from Sanity -> flatten it to speech-shaped plain text
 * -> TTS API -> upload the MP3 to Cloudinary -> patch the audio field back onto
 * the post.
 *
 * Provider-agnostic on purpose. TTS_PROVIDER picks between OpenAI and
 * ElevenLabs, both called with plain fetch — no SDKs, so switching provider
 * costs an env var rather than a dependency change and a rewrite. Adding a
 * third means adding one function below.
 *
 * Idempotent: a post that already has audio is skipped unless --force. Audio
 * costs money to generate and re-running the script over the archive should not
 * quietly re-bill for work already done.
 */

/* ---- env ---------------------------------------------------------------- */

loadDotEnvLocal();

const env = (name: string) => process.env[name]?.trim() ?? "";

function fail(message: string): never {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

const projectId = env("NEXT_PUBLIC_SANITY_PROJECT_ID");
const dataset = env("NEXT_PUBLIC_SANITY_DATASET") || "production";
const apiVersion = env("NEXT_PUBLIC_SANITY_API_VERSION") || "2026-07-01";
const writeToken = env("SANITY_API_WRITE_TOKEN");

const cloudName = env("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
const cloudKey = env("CLOUDINARY_API_KEY");
const cloudSecret = env("CLOUDINARY_API_SECRET");

const provider = (env("TTS_PROVIDER") || "openai").toLowerCase();

if (!projectId) fail("NEXT_PUBLIC_SANITY_PROJECT_ID is not set.");
if (!writeToken) fail("SANITY_API_WRITE_TOKEN is not set (Editor role, .env.local only).");
if (!cloudName || !cloudKey || !cloudSecret) {
  fail(
    "Cloudinary credentials missing. Needs NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET — the last two are for signed uploads and belong in .env.local only, never in Vercel.",
  );
}

const client = createClient({ projectId, dataset, apiVersion, token: writeToken, useCdn: false });

/* ---- post -> speech ------------------------------------------------------ */

type Span = { _type?: string; text?: string };
type Block = { _type: string; style?: string; children?: Span[]; [key: string]: unknown };

/**
 * Flatten a post into something worth listening to.
 *
 * Not the same as the markdown export. A reader skims headings and skips the
 * comparison table; a listener cannot, and a literal reading of every table
 * cell is unbearable. So headings become spoken transitions, structural blocks
 * that only work visually are summarised or dropped, and the short answer leads
 * because a listener has no way to glance ahead.
 */
function toSpeech(post: {
  title: string;
  shortAnswer?: string;
  body?: Block[];
  author?: { name?: string };
  faqs?: { question: string; answer: string }[];
}): string {
  const parts: string[] = [];

  parts.push(post.title);
  parts.push(`From the DebugSwift blog${post.author?.name ? `, by ${post.author.name}` : ""}.`);
  if (post.shortAnswer) parts.push(`The short answer. ${post.shortAnswer}`);

  for (const block of post.body ?? []) {
    if (block._type === "block") {
      const text = (block.children ?? [])
        .filter((c) => c._type === "span")
        .map((c) => c.text ?? "")
        .join("")
        .trim();
      if (!text) continue;
      /* A heading read as a bare fragment sounds like a glitch; a short pause
       * and a full stop makes it land as a section change. */
      parts.push(block.style === "h2" || block.style === "h3" ? `${text}.` : text);
      continue;
    }

    switch (block._type) {
      case "calloutBlock":
        parts.push(String(block.text ?? ""));
        break;
      case "stepsBlock": {
        const steps = (block.steps as { title: string; text?: string }[] | undefined) ?? [];
        if (block.title) parts.push(`${block.title}.`);
        steps.forEach((step, i) => {
          parts.push(`Step ${i + 1}. ${step.title}. ${step.text ?? ""}`);
        });
        break;
      }
      case "faqBlock": {
        const items = (block.items as { question: string; answer: string }[] | undefined) ?? [];
        for (const item of items) parts.push(`${item.question} ${item.answer}`);
        break;
      }
      case "sourcedStat":
        parts.push(`${block.value}. ${block.label}. Source, ${block.sourceLabel}.`);
        break;
      case "comparisonTable":
        /* Deliberately not read out. A table is a visual comparison; spoken
         * cell by cell it is noise, and the surrounding prose already makes
         * the point the table illustrates. */
        break;
      case "figure":
      case "serviceLink":
      case "codeBlock":
        break;
      default:
        break;
    }
  }

  for (const faq of post.faqs ?? []) {
    parts.push(`${faq.question} ${faq.answer}`);
  }

  parts.push(
    "This was a DebugSwift post. If something in your business is costing you more than it should, the diagnosis call is free — debugswift dot com slash contact.",
  );

  return parts.join("\n\n");
}

/* ---- TTS providers ------------------------------------------------------- */

/* Both APIs cap the text per request well below a full article, so long posts
 * are spoken in chunks and the MP3 frames concatenated. MP3 tolerates naive
 * concatenation — each chunk is a complete frame sequence — which is why this
 * needs no audio library. Chunks split on paragraph boundaries so a sentence
 * never straddles a join and produces an audible clip. */
function chunk(text: string, limit: number): string[] {
  const paragraphs = text.split("\n\n");
  const out: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > limit && current) {
      out.push(current);
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current) out.push(current);
  return out;
}

async function ttsOpenAI(text: string): Promise<Buffer> {
  const key = env("OPENAI_API_KEY");
  if (!key) fail("TTS_PROVIDER=openai but OPENAI_API_KEY is not set.");
  const model = env("TTS_MODEL") || "gpt-4o-mini-tts";
  const voice = env("TTS_VOICE") || "alloy";

  const buffers: Buffer[] = [];
  for (const part of chunk(text, 3800)) {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, voice, input: part, response_format: "mp3" }),
    });
    if (!res.ok) fail(`OpenAI TTS failed (${res.status}): ${await res.text()}`);
    buffers.push(Buffer.from(await res.arrayBuffer()));
  }
  return Buffer.concat(buffers);
}

async function ttsElevenLabs(text: string): Promise<Buffer> {
  const key = env("ELEVENLABS_API_KEY");
  const voiceId = env("TTS_VOICE");
  if (!key) fail("TTS_PROVIDER=elevenlabs but ELEVENLABS_API_KEY is not set.");
  if (!voiceId) fail("TTS_VOICE must be an ElevenLabs voice id.");
  const model = env("TTS_MODEL") || "eleven_multilingual_v2";

  const buffers: Buffer[] = [];
  for (const part of chunk(text, 4800)) {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ text: part, model_id: model }),
      },
    );
    if (!res.ok) fail(`ElevenLabs TTS failed (${res.status}): ${await res.text()}`);
    buffers.push(Buffer.from(await res.arrayBuffer()));
  }
  return Buffer.concat(buffers);
}

function synthesize(text: string): Promise<Buffer> {
  if (provider === "openai") return ttsOpenAI(text);
  if (provider === "elevenlabs") return ttsElevenLabs(text);
  return fail(`Unknown TTS_PROVIDER "${provider}". Supported: openai, elevenlabs.`);
}

/* ---- Cloudinary ---------------------------------------------------------- */

/**
 * Signed upload, as `video` — Cloudinary handles audio under its video
 * resource type, which trips people up: uploading an MP3 as `raw` works but
 * loses duration metadata and the delivery transformations.
 *
 * The signature is a SHA-1 of the alphabetised parameters plus the API secret.
 * Doing it inline avoids the cloudinary SDK for what is six lines of hashing.
 */
async function uploadToCloudinary(
  mp3: Buffer,
  publicId: string,
): Promise<{ url: string; duration: number | null }> {
  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string> = {
    folder: "blog/audio",
    overwrite: "true",
    public_id: publicId,
    timestamp: String(timestamp),
  };
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const signature = createHash("sha1").update(toSign + cloudSecret).digest("hex");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(mp3)], { type: "audio/mpeg" }), `${publicId}.mp3`);
  for (const [k, v] of Object.entries(params)) form.append(k, v);
  form.append("api_key", cloudKey);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) fail(`Cloudinary upload failed (${res.status}): ${await res.text()}`);

  const json = (await res.json()) as { secure_url?: string; duration?: number };
  if (!json.secure_url) fail("Cloudinary returned no secure_url.");
  return { url: json.secure_url, duration: json.duration ?? null };
}

/* ---- main ---------------------------------------------------------------- */

type PostDoc = {
  _id: string;
  title: string;
  slug: string;
  shortAnswer?: string;
  body?: Block[];
  faqs?: { question: string; answer: string }[];
  author?: { name?: string };
  audio?: { url?: string } | null;
};

const QUERY = `*[_type == "post" && !(_id in path("drafts.**")) $FILTER]{
  _id, title, "slug": slug.current, shortAnswer, body, faqs, audio,
  author->{ name }
}`;

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const all = args.includes("--all");
  const slug = args.find((a) => !a.startsWith("--"));

  if (!all && !slug) {
    fail("Usage: npm run audio <slug> [--force]   |   npm run audio --all");
  }

  const query = QUERY.replace("$FILTER", all ? "" : "&& slug.current == $slug");
  const posts = await client.fetch<PostDoc[], Record<string, string>>(
    query,
    all ? {} : { slug: slug! },
  );

  if (!posts.length) fail(all ? "No published posts found." : `No published post with slug "${slug}".`);

  const voiceLabel =
    env("TTS_VOICE_LABEL") || `a synthetic voice (${provider}${env("TTS_VOICE") ? `, ${env("TTS_VOICE")}` : ""})`;

  console.log(`\n  Provider: ${provider}   Voice label: ${voiceLabel}\n`);

  for (const post of posts) {
    if (post.audio?.url && !force) {
      console.log(`  · ${post.slug} — already has audio, skipped (--force to redo)`);
      continue;
    }

    const script = toSpeech(post);
    const words = script.split(/\s+/).filter(Boolean).length;
    console.log(`  → ${post.slug} — ${words} words, synthesising…`);

    const mp3 = await synthesize(script);
    console.log(`    ${Math.round(mp3.length / 1024)}KB, uploading…`);

    const { url, duration } = await uploadToCloudinary(mp3, post.slug);

    await client
      .patch(post._id)
      .set({
        audio: {
          url,
          durationSeconds: duration ? Math.round(duration) : null,
          voice: voiceLabel,
          generatedAt: new Date().toISOString(),
        },
      })
      .commit();

    console.log(`  ✓ ${post.slug} — ${duration ? Math.round(duration) + "s" : "done"}\n`);
  }

  console.log("  Done. Republish the post (or hit the revalidate webhook) to show the player.\n");
}

main().catch((error: unknown) => {
  console.error("\n  ✗ Audio generation failed:", error instanceof Error ? error.message : error, "\n");
  process.exit(1);
});
