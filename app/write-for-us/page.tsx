import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import Eyebrow from "@/components/Eyebrow";
import JsonLd from "@/components/JsonLd";
import PitchForm from "@/components/PitchForm";
import { blogUrl, canonicalPath, siteUrl } from "@/lib/links";
import { breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo";

/* /blog/write-for-us — the public pitch page.
 *
 * The rules below are on the page rather than in a private policy for two
 * reasons. It filters: anyone here to buy a dofollow link reads the third rule
 * and leaves, which is most of the inbound volume gone before it becomes a
 * queue to triage. And it is the honest version of a page that is usually a
 * trap — most "write for us" pages omit the nofollow policy precisely because
 * saying it out loud costs them submissions.
 *
 * This page is indexed on purpose. "Write for us" pages attract links, and this
 * one is a genuine invitation rather than bait. */

const faqs = [
  {
    question: "Do you pay for guest posts?",
    answer:
      "No, and we don't charge for them either. If either of those is what you're after, this isn't the right place — it's a place to write something you want read by people running small businesses.",
  },
  {
    question: "Can I include a link to my site?",
    answer:
      "Yes, in your author bio, and in the body where it genuinely helps the reader. Every outbound link in a guest post carries rel=\"nofollow ugc\", with no exceptions and no way to buy one. That's what keeps this section worth reading.",
  },
  {
    question: "How long should the post be?",
    answer:
      "800 to 1,500 words, one idea, a concrete example inside the first three paragraphs. Longer isn't better — a post that says one thing properly beats one that says four things briefly.",
  },
  {
    question: "Will you edit it?",
    answer:
      "Yes. Structure, headings and clarity, and we'll cut anything that reads like an advert. You'll see the edit before it goes live, and nothing publishes without you agreeing to it.",
  },
  {
    question: "How long does it take to hear back?",
    answer:
      "A pitch gets a yes or a no. We'd rather tell you it isn't a fit than leave you refreshing an inbox — that's the same standard we hold ourselves to on enquiries.",
  },
];

export const metadata: Metadata = {
  title: "Write for the DebugSwift blog",
  description:
    "Pitch a post to the DebugSwift blog. One owner question, 800–1,500 words, edited before publishing. All outbound links are nofollow — no paid placements, ever.",
  alternates: { canonical: canonicalPath("/write-for-us") },
  openGraph: {
    type: "website",
    title: "Write for the DebugSwift blog",
    description:
      "Pitch a post. One owner question, 800–1,500 words, edited before publishing. All outbound links are nofollow.",
  },
};

export default function WriteForUsPage() {
  const trail = [
    { name: "Home", url: siteUrl("/") },
    { name: "Blog", url: blogUrl("/") },
    { name: "Write for us", url: blogUrl("/write-for-us") },
  ];

  return (
    <main className="mx-auto w-full max-w-canvas px-6 py-10 md:px-12 md:py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [faqPageJsonLd(faqs), breadcrumbJsonLd(trail)].filter(Boolean),
        }}
      />

      <Breadcrumbs trail={trail} />

      <div className="mt-8 max-w-3xl">
        <Eyebrow>Write for us</Eyebrow>
        <h1 className="mt-4 text-h1-mobile text-ink md:text-h1">
          Got something a business owner should know?
        </h1>
        <p className="mt-5 text-slate">
          We publish people who&apos;ve actually done the thing they&apos;re
          writing about — an owner who fixed a process, a developer who watched a
          rebuild go wrong, an accountant who can explain what nobody explains.
          Pitch first; if it&apos;s a fit we&apos;ll send you a link to submit the
          full draft.
        </p>
      </div>

      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="max-w-2xl">
          <h2 className="text-h2 text-ink">Pitch a post</h2>
          <div className="mt-8">
            <PitchForm />
          </div>
        </div>

        <aside className="space-y-6">
          <section className="rounded-card border-[1.5px] border-ink bg-paper p-6">
            <p className="text-eyebrow uppercase text-indigo-600">The rules</p>
            <ol className="mt-4 space-y-4">
              {[
                [
                  "One owner question",
                  "The title is a question a business owner would actually type. 800–1,500 words answering it, with a concrete example early.",
                ],
                [
                  "Nothing that reads like an advert",
                  "Mention your company where it's relevant. Write a case study for it and we'll decline — politely, but we will.",
                ],
                [
                  "Every outbound link is nofollow",
                  "rel=\"nofollow ugc\", automatically, on every link in the body and the bio. It isn't a setting and it isn't for sale. If that's a dealbreaker, this saved us both an email.",
                ],
                [
                  "We edit, you approve",
                  "Structure and clarity, plus anything that reads as a pitch. You see it before it publishes.",
                ],
                [
                  "Your name on it",
                  "Real author, real bio, own page on the site. No pseudonyms and no agency-written posts under a client's name.",
                ],
              ].map(([title, text], i) => (
                <li key={title} className="flex gap-4">
                  <span className="mt-0.5 shrink-0 text-eyebrow uppercase text-indigo-600 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-medium text-ink">{title}</p>
                    <p className="mt-1 text-small text-slate">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-card border-[1.5px] border-ink bg-sand p-6">
            <p className="text-eyebrow uppercase text-indigo-600">Common questions</p>
            <div className="mt-4 divide-y-[1.5px] divide-mist border-y-[1.5px] border-mist">
              {faqs.map((faq) => (
                <details key={faq.question} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-medium text-ink marker:hidden">
                    {faq.question}
                    <span
                      aria-hidden="true"
                      className="mt-1 shrink-0 text-indigo-600 transition-transform duration-200 ease-out group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-small text-slate">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
