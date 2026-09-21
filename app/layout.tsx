import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import ReactDOM from "react-dom";
import CrossAppPrefetch from "@/components/CrossAppPrefetch";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import StickyMobileBar from "@/components/StickyMobileBar";
import TopicNav from "@/components/TopicNav";
import { blogUrl, canonicalPath, SITE_URL } from "@/lib/links";
import { CONTACT_EMAIL, SOCIALS } from "@/lib/site";
import "./globals.css";

/* Entity continuity across two deployments.
 *
 * A crawler fetching debugswift.com/blog/<post> receives THIS app's HTML, not
 * the main site's — so the Organization graph declared in E:\debugswift's
 * app/layout.tsx is simply absent from the document. Referencing its @id from
 * here without defining the node would leave a dangling reference in every post.
 *
 * So the blog re-declares a compact Organization under the SAME @id
 * (https://debugswift.com/#org). Same identifier, same name, same logo, same
 * sameAs list — consistent, never contradictory. Search engines and LLMs
 * reconcile the two into one entity instead of inventing a second company.
 *
 * Every BlogPosting downstream points its publisher and isPartOf at these two
 * @ids.
 *
 * NO SearchAction on the WebSite node, and this is a correction rather than an
 * omission. It used to carry one pointing at /blog/search?q={search_term_string},
 * which is a URL that does not exist: search was deliberately turned into a
 * client-side filter on the post list (see components/PostGrid.tsx), the route
 * was deleted, and the marketing repo has already dropped /blog/search from its
 * robots policy for the same reason.
 *
 * A SearchAction is a promise that a crawler can construct that URL and get
 * results. Ours would have 404'd. Markup that describes a capability the site
 * does not have is the kind that gets a rich result dropped, so it is gone.
 *
 * If a real search endpoint is ever built — the note in lib/pagination.ts says
 * that becomes necessary once the archive outgrows one page — add the node back
 * at the same time, not before. */
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "DebugSwift",
      url: SITE_URL,
      logo: `${SITE_URL}/brand/debugswift-icon-color.svg`,
      email: CONTACT_EMAIL,
      sameAs: SOCIALS.map((s) => s.href),
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "DebugSwift",
      publisher: { "@id": `${SITE_URL}/#org` },
      inLanguage: "en",
    },
  ],
};

/* Satoshi only — Inter is banned (design system §2). Variable woff2, 300–900.
 *
 * This used to say the font could not be borrowed from the main app across the
 * proxy, and kept its own next/font copy. That was only true of standalone dev.
 * In production this app is served from debugswift.com, where /fonts/ belongs
 * to the MAIN deployment and is not proxied — so an absolute path reaches it
 * and all three apps finally share one URL and one cache entry, instead of
 * re-downloading the same 41.6KB file and re-swapping the type on every hop.
 *
 * The @font-face lives in app/globals.css; next.config.ts redirects /fonts/*
 * back to this repo's own copy so standalone dev still works. */
function preloadFont() {
  /* ReactDOM.preload rather than a rendered <link>: React hoists the element
   * and also emits it in the head preamble, so the tag comes out twice. */
  ReactDOM.preload("/fonts/Satoshi-Variable.woff2", {
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  });
}

export const metadata: Metadata = {
  /* The canonical host is the MAIN domain, never the *.vercel.app origin this
   * app is actually deployed to. Without this every canonical, OG url and
   * JSON-LD id would advertise the proxy origin and split the site in two. */
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Blog — DebugSwift",
    /* Matches the main site's template so a tab from either deployment reads
     * the same way. */
    template: "%s — DebugSwift",
  },
  description:
    "Plain-language write-ups on what technology is worth paying for, what isn't, and how to tell the difference. Written for owners of small and mid-sized businesses by the people who build the fixes.",
  /* The MAIN site's manifest, at the domain root. This repo deliberately ships
   * no manifest.ts: one domain gets one web app manifest, and a second one at
   * /blog/manifest.webmanifest would give the same site two different names and
   * icon sets depending on which page it was added to the home screen from.
   * Metadata URLs skip basePath, so this resolves to debugswift.com/... */
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: canonicalPath("/"),
    types: {
      "application/rss+xml": [{ url: blogUrl("/rss.xml"), title: "DebugSwift Blog" }],
      "application/feed+json": [{ url: blogUrl("/feed.json"), title: "DebugSwift Blog" }],
    },
  },
  openGraph: {
    type: "website",
    siteName: "DebugSwift",
    url: blogUrl("/"),
    images: [
      {
        /* Absolute, and pointing at THIS deployment's copy (public/og.png is
         * served at /blog/og.png under basePath). Next does not apply basePath
         * to metadata URLs, so a relative "/og.png" would silently resolve to
         * the main site's file instead. */
        url: blogUrl("/og.png"),
        width: 1200,
        height: 630,
        alt: "DebugSwift — Debugging businesses swiftly.",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  preloadFont();
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <CrossAppPrefetch />
        {/* Skip link.
          *
          * This deployment puts TWO navigation bars before the article — the
          * shared site Header with its twelve-item services dropdown, plus
          * TopicNav — so a keyboard or screen-reader user was tabbing through
          * roughly twenty links on every single page before reaching a word of
          * the post. Visually hidden until focused, then a normal-looking
          * button in the top-left. */}
        <a
          href="#content"
          className="sr-only z-50 rounded-full border-[1.5px] border-ink bg-cream px-5 py-3 font-medium text-ink focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <Header />
        {/* Blog-local navigation, under the site header on every route. The
         * site Header is shared with the main deployment and has no room for
         * five topics; this strip is what makes categories reachable from a
         * post rather than only from the index. */}
        <TopicNav />
        {/* tabIndex -1 so the skip link can move focus here, not just scroll. */}
        <div id="content" tabIndex={-1} className="flex-1">
          {children}
        </div>
        <Footer />
        <StickyMobileBar />
        {/* Separate deployment = separate Analytics mount. The main site's
         * instance does not cover pages served from this origin. */}
        <Analytics />
      </body>
    </html>
  );
}
