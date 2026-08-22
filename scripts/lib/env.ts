import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient, type SanityClient } from "@sanity/client";

/* Environment and clients for the CLI scripts.
 *
 * The app gets its variables from Next; a standalone script does not. This was
 * copied verbatim in seed.ts and audio.ts, and push.ts would have been the
 * third copy — which is the point at which a duplicated function stops being
 * cheaper than a shared one.
 *
 * Still no dotenv. The grammar is KEY=value and this is nine lines of it.
 */

export function loadDotEnvLocal(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, value] = match;
      /* Never overwrite something already exported — an operator setting a
       * variable on the command line means it. */
      if (!process.env[key!]) {
        process.env[key!] = value!.replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* No .env.local is fine if the variables are already exported. */
  }
}

export function fail(message: string): never {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

export type ScriptEnv = {
  projectId: string;
  dataset: string;
  apiVersion: string;
  token: string;
  cloudinaryCloud: string;
  cloudinaryKey: string;
  cloudinarySecret: string;
};

/** Reads the environment a write script needs, failing with one clear sentence
 *  rather than a stack trace when something is missing. */
export function readEnv(): ScriptEnv {
  loadDotEnvLocal();

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();

  if (!projectId) fail("NEXT_PUBLIC_SANITY_PROJECT_ID is not set. Add it to .env.local.");
  if (!token) {
    fail(
      "SANITY_API_WRITE_TOKEN is not set. Create an Editor token at sanity.io/manage → API → Tokens, and put it in .env.local (never in Vercel).",
    );
  }

  return {
    projectId,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production",
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION?.trim() || "2026-07-01",
    token,
    cloudinaryCloud: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ?? "",
    cloudinaryKey: process.env.CLOUDINARY_API_KEY?.trim() ?? "",
    cloudinarySecret: process.env.CLOUDINARY_API_SECRET?.trim() ?? "",
  };
}

export function writeClient(env: ScriptEnv): SanityClient {
  return createClient({
    projectId: env.projectId,
    dataset: env.dataset,
    apiVersion: env.apiVersion,
    token: env.token,
    useCdn: false,
  });
}
