import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import localFont from "next/font/local";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import StickyMobileBar from "@/components/StickyMobileBar";
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
 * The WebSite node carries the SearchAction, which is what earns a sitelinks
 * search box, and every BlogPosting downstream points its publisher and
 * isPartOf at these two @ids. */
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
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${blogUrl("/search")}?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

/* Satoshi only — Inter is banned (design system §2). Variable woff2, 300–900.
 * Copied from E:\debugswift\public\fonts: /public is served by THIS deployment,
 * so the font cannot be borrowed from the main app across the proxy. */
const satoshi = localFont({
  src: [
    {
      path: "../public/fonts/Satoshi-Variable.woff2",
      weight: "300 900",
      style: "normal",
    },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

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
  return (
    <html lang="en" className={`${satoshi.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
        <StickyMobileBar />
        {/* Separate deployment = separate Analytics mount. The main site's
         * instance does not cover pages served from this origin. */}
        <Analytics />
      </body>
    </html>
  );
}
