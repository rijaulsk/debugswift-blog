"use client";

import { NextStudio } from "next-sanity/studio";
import config from "@/sanity.config";

/* The Studio, isolated behind a client boundary.
 *
 * This file exists for one specific build failure. The Sanity Studio is a
 * browser application: it imports `swr`, which ships a separate
 * react-server.mjs build with no default export. Importing sanity.config.ts
 * from a Server Component drags the entire Studio into the RSC module graph,
 * where `import useSWR from "swr"` resolves to that server build and the build
 * fails with "The export default was not found in module … react-server.mjs".
 *
 * Marking this boundary "use client" keeps the whole Studio — and every
 * transitive dependency that assumes a browser — out of the server graph. The
 * page beside it stays a Server Component so it can still read env vars and
 * export metadata. */
export default function StudioClient() {
  return <NextStudio config={config} />;
}
