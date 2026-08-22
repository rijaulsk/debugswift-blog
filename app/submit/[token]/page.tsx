import type { Metadata } from "next";
import Link from "next/link";
import DraftForm from "@/components/DraftForm";
import Eyebrow from "@/components/Eyebrow";
import { getClient, groqFetch } from "@/sanity/lib/client";
import { pitchByTokenQuery } from "@/sanity/lib/queries";
import { isInviteValid } from "@/lib/guest";
import { BLOG } from "@/lib/links";
import { CONTACT_EMAIL } from "@/lib/site";

/* /blog/submit/<token> — the invited draft page.
 *
 * force-dynamic, and it has to be. A token page that got statically generated
 * would either bake a valid invite into a cached HTML file or, worse, be
 * prerendered at build for tokens that did not exist yet. Every visit
 * revalidates against Sanity.
 *
 * noindex + nofollow: a page that exists for exactly one person, once.
 *
 * The validation here is for the READER's benefit — so an expired link says so
 * instead of failing after they've pasted two thousand words. It is not the
 * security boundary. /api/draft revalidates the token on submit, independently,
 * because the gap between rendering a form and submitting it is unbounded. */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Submit your draft",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

function Invalid({ reason }: { reason: string }) {
  return (
    <main className="mx-auto w-full max-w-canvas px-6 py-24 md:px-12">
      <div className="max-w-xl">
        <Eyebrow>Invite link</Eyebrow>
        <h1 className="mt-4 text-balance text-h2-mobile text-ink md:text-h2">{reason}</h1>
        <p className="mt-5 text-slate">
          Reply to the email that sent you this link and we&apos;ll issue a fresh
          one, or write to{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-indigo-600 underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
          . If you haven&apos;t pitched yet,{" "}
          <Link
            href={BLOG.writeForUs}
            className="font-medium text-indigo-600 underline underline-offset-4"
          >
            start here
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

export default async function SubmitDraftPage({ params }: Props) {
  const { token } = await params;
  const client = getClient();

  if (!client) {
    return <Invalid reason="Submissions aren't connected on this deployment yet." />;
  }

  const pitch = await groqFetch<{
    _id: string;
    name?: string;
    topicIdea?: string;
    status?: string;
    inviteExpires?: string;
  } | null>(client, pitchByTokenQuery, { token });

  /* One message for every failure mode — unknown, declined, expired and
   * already-used all read the same. Distinguishing them would let someone
   * probe for valid tokens by reading the difference. */
  if (!isInviteValid(pitch)) {
    return <Invalid reason="This invite link isn't valid any more." />;
  }

  return (
    <main className="mx-auto w-full max-w-canvas px-6 py-10 md:px-12 md:py-14">
      <div className="max-w-2xl">
        <Eyebrow>Invited draft</Eyebrow>
        <h1 className="mt-4 text-h1-mobile text-ink md:text-h1">
          Send us the piece.
        </h1>
        {pitch.topicIdea && (
          <p className="mt-5 text-slate">
            You pitched:{" "}
            <span className="font-medium text-ink">{pitch.topicIdea}</span>
          </p>
        )}
        <p className="mt-3 text-slate">
          800–1,500 words, one idea, a concrete example early. We&apos;ll edit
          for structure and clarity and send it back before anything publishes.
          This link works once.
        </p>

        <div className="mt-12">
          <DraftForm token={token} writerName={pitch.name ?? ""} />
        </div>
      </div>
    </main>
  );
}
