import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildPrompt, REJECT_LIST } from "@/scripts/lib/artDirection";
import { fail, readEnv, writeClient, type ScriptEnv } from "@/scripts/lib/env";

/* npm run cover <slug>                      generate variants to review
 * npm run cover <slug> -- --use 2 --alt "…" attach the one you picked
 *
 * TWO COMMANDS ON PURPOSE, and the split is the whole safety model.
 *
 * The first writes image files to covers/ and attaches nothing. The second
 * uploads one of them and requires --alt, which cannot be written without
 * having looked at the picture. So a human has seen every image that reaches a
 * page, and the thing forcing that is a field a screen-reader user needs
 * anyway rather than a confirmation prompt nobody reads.
 *
 * Generation is Cloudflare Workers AI running FLUX.1 Schnell — free daily
 * allowance, no card, Apache-2.0 model. Groq and OpenRouter are text-only and
 * cannot do this.
 *
 * WHAT THIS WILL NOT DO. It will not put a person in an image: the prompt says
 * still life only and §9 of the prompt book rejects a human face outright. A
 * generated face is "never invent a person" broken in pixels. It also asks for
 * no readable lettering — baked-in text is a claim nobody wrote, and real type
 * gets set in the page.
 *
 * The cover is for the PAGE, not for sharing. lib/seo.ts sends the generated
 * title card to social previews either way, because a thumbnail needs words on
 * it and an abstract still life at 200px wide says nothing.
 */

const MODEL = "@cf/black-forest-labs/flux-1-schnell";
const VARIANTS = 3;
/* 4 is the model's default and 8 its maximum; schnell is a few-step model and
 * the returns above this are not worth the wait. */
const STEPS = 6;

const out = (line = "") => console.log(line);

type Args = { slug: string; use: number | null; alt: string | null };

function parseArgs(argv: string[]): Args {
  const slug = argv.find((a) => !a.startsWith("--"));
  if (!slug) {
    fail('usage: npm run cover <slug> -- [--use <n>] [--alt "what the image shows"]');
  }

  const valueOf = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i === -1 ? null : (argv[i + 1] ?? null);
  };

  const rawUse = valueOf("--use");
  const use = rawUse === null ? null : Number(rawUse);
  if (use !== null && (!Number.isInteger(use) || use < 1 || use > VARIANTS)) {
    fail(`--use takes a number from 1 to ${VARIANTS}`);
  }

  return { slug, use, alt: valueOf("--alt") };
}

/* ------------------------------------------------------------- cloudflare */

type CfResponse = {
  success?: boolean;
  result?: { image?: string };
  errors?: { code?: number; message?: string }[];
};

async function generate(env: ScriptEnv, prompt: string, seed: number): Promise<Buffer> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();

  if (!account || !token) {
    fail(
      "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are not set in .env.local.\n\n" +
        "    Account ID: dash.cloudflare.com → Workers & Pages → the ID in the right-hand rail.\n" +
        "    Token:      My Profile → API Tokens → Create Token → Custom, with the single\n" +
        "                permission 'Account · Workers AI · Read'.\n\n" +
        "    Both are local-only. Never set them on Vercel — nothing in the running site\n" +
        "    generates images.",
    );
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${MODEL}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ prompt, steps: STEPS, seed }),
    },
  );

  if (response.status === 401 || response.status === 403) {
    fail(
      `Cloudflare rejected the token (${response.status}). It needs the "Workers AI — Read" permission on the account whose ID is in CLOUDFLARE_ACCOUNT_ID.`,
    );
  }
  if (response.status === 429) {
    fail("Cloudflare says you are out of free Workers AI allowance for now. Try tomorrow.");
  }

  const data = (await response.json()) as CfResponse;

  if (!response.ok || !data.success || !data.result?.image) {
    const why = data.errors?.map((e) => e.message).filter(Boolean).join("; ");
    fail(`Cloudflare returned ${response.status}${why ? ` — ${why}` : ""}`);
  }

  return Buffer.from(data.result.image, "base64");
}

/* ------------------------------------------------------------- cloudinary */

type Uploaded = {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  resource_type: string;
};

/** Signed upload, same scheme scripts/audio.ts already uses for the MP3s. */
async function uploadToCloudinary(env: ScriptEnv, file: Buffer, publicId: string): Promise<Uploaded> {
  if (!env.cloudinaryCloud || !env.cloudinaryKey || !env.cloudinarySecret) {
    fail("Cloudinary is not fully configured in .env.local — cloud name, key and secret are all needed to upload.");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "blog/covers";
  /* Cloudinary signs the alphabetised parameter list plus the secret. */
  const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${env.cloudinarySecret}`;
  const signature = createHash("sha1").update(toSign).digest("hex");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(file)], { type: "image/png" }), `${publicId}.png`);
  form.append("api_key", env.cloudinaryKey);
  form.append("timestamp", String(timestamp));
  form.append("public_id", publicId);
  form.append("folder", folder);
  form.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.cloudinaryCloud}/image/upload`,
    { method: "POST", body: form },
  );

  const data = (await response.json()) as Uploaded & { error?: { message?: string } };
  if (!response.ok || !data.public_id) {
    fail(`Cloudinary upload failed — ${data.error?.message ?? response.status}`);
  }
  return data;
}

/* -------------------------------------------------------------------- main */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = readEnv();
  const client = writeClient(env);

  const post = await client
    .withConfig({ perspective: "raw" })
    .fetch<{ _id: string; title: string; topic: { title?: string } | null } | null>(
      `*[_type == "post" && slug.current == $slug && !(_id in path("drafts.**"))][0]{
         _id, title, topic->{ title }
       }`,
      { slug: args.slug },
    );

  if (!post) fail(`no published post with slug "${args.slug}"`);

  const dir = resolve(process.cwd(), "covers");
  mkdirSync(dir, { recursive: true });

  /* ---- attach a variant that already exists ---- */
  if (args.use !== null) {
    if (!args.alt?.trim()) {
      fail(
        "--alt is required.\n\n" +
          "    Describe what the image actually shows, in this post's context. It is what a\n" +
          "    screen-reader user hears, and writing it is the step that guarantees somebody\n" +
          "    looked at the picture before it reached a page.",
      );
    }

    const path = resolve(dir, `${args.slug}-${args.use}.png`);
    let file: Buffer;
    try {
      file = readFileSync(path);
    } catch {
      return fail(`covers/${args.slug}-${args.use}.png is not there — run \`npm run cover ${args.slug}\` first`);
    }

    const asset = await uploadToCloudinary(env, file, args.slug);

    await client
      .patch(post._id)
      .set({
        cover: {
          _type: "cloudinary.asset",
          public_id: asset.public_id,
          secure_url: asset.secure_url,
          format: asset.format,
          width: asset.width,
          height: asset.height,
          resource_type: asset.resource_type,
        },
        coverAlt: args.alt.trim(),
      })
      .commit();

    out();
    out(`  ✓ attached covers/${args.slug}-${args.use}.png to ${args.slug}`);
    out(`    ${asset.public_id}  ${asset.width}x${asset.height}`);
    out();
    out("    The share card is unchanged — social previews keep the title card,");
    out("    because a thumbnail needs words on it. This is the in-page image.");
    out();
    return;
  }

  /* ---- generate variants to look at ---- */
  const prompt = buildPrompt(post.title, post.topic?.title ?? null);

  out();
  out(`  ${args.slug}`);
  out(`  ${post.title}`);
  out();
  out(`  Generating ${VARIANTS} variants with FLUX.1 Schnell…`);

  for (let i = 1; i <= VARIANTS; i += 1) {
    const image = await generate(env, prompt, Math.floor(Math.random() * 1_000_000));
    writeFileSync(resolve(dir, `${args.slug}-${i}.png`), image);
    out(`    ${i}. covers/${args.slug}-${i}.png  (${Math.round(image.length / 1024)}KB)`);
  }

  out();
  out("  Open them and reject any that has:");
  for (const item of REJECT_LIST) out(`    · ${item}`);
  out();
  out("  Then attach the one you want:");
  out(`    npm run cover ${args.slug} -- --use 1 --alt "what the image shows"`);
  out();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
