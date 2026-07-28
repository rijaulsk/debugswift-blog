import type { Metadata, Viewport } from "next";
import StudioClient from "./StudioClient";
import { IS_SANITY_CONFIGURED } from "@/lib/env";

/* The Studio, served at /blog/studio (basePath + this route).
 *
 * noindex is not optional. The main deployment's robots.txt is the only one a
 * crawler ever fetches for this domain — a proxied subdirectory cannot serve its
 * own — so this page's meta robots tag is the primary control, with a Disallow
 * line in E:\debugswift\app\robots.ts as the belt to its braces.
 *
 * metadata and viewport are declared here rather than re-exported from
 * next-sanity/studio: that re-export pulls the Studio's module graph into the
 * server bundle, which is the failure StudioClient.tsx exists to avoid.
 *
 * The configured/unconfigured split lets this repo build on a fresh clone with
 * no Sanity account. NextStudio resolves a workspace at render time and throws
 * on an empty projectId, which would fail the build rather than degrade. */

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
  referrer: "same-origin",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /* The Studio is a dense editing UI, not a document — pinch-zoom on it
   * produces a broken layout rather than larger text. */
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content",
};

export default function StudioPage() {
  if (!IS_SANITY_CONFIGURED) {
    return (
      <main className="mx-auto w-full max-w-canvas px-6 py-24 md:px-12">
        <p className="text-eyebrow uppercase text-indigo-600">Studio</p>
        <h1 className="mt-3 max-w-2xl text-h2 text-ink">
          No Sanity project connected yet.
        </h1>
        <p className="mt-5 max-w-2xl text-slate">
          Set <code className="rounded bg-sand px-1.5 py-0.5">NEXT_PUBLIC_SANITY_PROJECT_ID</code>{" "}
          and <code className="rounded bg-sand px-1.5 py-0.5">NEXT_PUBLIC_SANITY_DATASET</code> in{" "}
          <code className="rounded bg-sand px-1.5 py-0.5">.env.local</code>, add{" "}
          <code className="rounded bg-sand px-1.5 py-0.5">http://localhost:3000</code> to the
          project&apos;s CORS origins, and restart the dev server. Until then the blog renders the
          local content in <code className="rounded bg-sand px-1.5 py-0.5">content/</code>.
        </p>
      </main>
    );
  }

  return <StudioClient />;
}
