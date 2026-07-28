import type { Metadata } from "next";
import Link from "next/link";
import CircuitPattern from "@/components/CircuitPattern";
import DebScene from "@/components/DebScene";
import Eyebrow from "@/components/Eyebrow";
import MainSiteLink from "@/components/MainSiteLink";
import { variantClasses } from "@/components/Button";
import { BLOG, MAIN } from "@/lib/links";

/* 404 — thinking-pose Deb + circuit pattern, ported from the main site.
 *
 * The two CTAs differ from the main site's on purpose: someone who lands on a
 * dead URL under /blog was looking for something to READ. Sending them to the
 * homepage first would be answering a question they didn't ask, so the primary
 * action is the blog index and the main site is the secondary. */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="relative overflow-hidden">
      <CircuitPattern opacity={0.08} />
      <div className="relative mx-auto w-full max-w-canvas px-6 pt-24 pb-32 md:px-12 md:pt-36 md:pb-44">
        <div className="grid items-end gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,8fr)_minmax(0,3fr)]">
          <div className="text-center lg:text-left">
            <Eyebrow>404</Eyebrow>
            <h1 className="mt-5 max-w-2xl text-h1-mobile md:text-h1">
              Nothing here — Deb checked twice.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-slate lg:mx-0">
              The post may have moved, or the address may have a typo in it.
              Everything we&apos;ve published is one link away.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              {/* Blog-internal: next/link, so basePath resolves it to /blog. */}
              <Link href={BLOG.home} className={variantClasses.secondary}>
                Read the blog
              </Link>
              {/* Main site: bare <a>, or basePath would send it to /blog/. */}
              <MainSiteLink href={MAIN.home} className={variantClasses.tertiary}>
                Back to debugswift.com →
              </MainSiteLink>
            </div>
          </div>
          <DebScene
            pose="thinking"
            line="It was here a second ago…"
            width={320}
            className="w-[200px] justify-self-center lg:w-[280px] lg:justify-self-end xl:w-[320px]"
          />
        </div>
      </div>
    </main>
  );
}
