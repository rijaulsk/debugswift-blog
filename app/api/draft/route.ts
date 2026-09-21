import { getWriteClient, groqFetch } from "@/sanity/lib/client";
import { pitchByTokenQuery } from "@/sanity/lib/queries";
import { isInviteValid } from "@/lib/guest";
import { clientKey, rateLimit } from "@/lib/rateLimit";

/* Step 3 of the guest pipeline: an INVITED writer submits their draft.
 *
 * Unreachable without a token minted by the owner approving a pitch in the
 * Studio (sanity/actions/approvePitch.ts). That is what makes it safe for this
 * endpoint to accept a whole article when /api/pitch would not: the caller is
 * someone whose pitch a human already read and said yes to.
 *
 * The token is validated server-side on every request — never trusted from the
 * page that rendered the form — and three things can invalidate it: the pitch
 * is not in "approved" state, the expiry has passed, or a draft has already
 * been submitted against it. Single use is enforced by flipping the pitch to
 * "drafted" in the same request that accepts the draft.
 *
 * The body arrives as a STRING and is stored as one. Converting it to real
 * content blocks is a Studio action the owner runs after reading it
 * (sanity/actions/createPostFromDraft.ts), and the post it produces is an
 * unpublished draft with required fields deliberately left empty. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMITS = {
  title: 120,
  body: 60_000,
  authorName: 80,
  authorBio: 600,
};

type DraftBody = {
  token?: string;
  title?: string;
  body?: string;
  authorName?: string;
  authorBio?: string;
  company_website?: string;
};

const clean = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: Request) {
  /* Looser than the pitch limit — this is an invited writer who may legitimately
   * resubmit after a network failure — but still bounded. */
  const limited = rateLimit(`draft:${clientKey(request)}`, {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    return Response.json(
      { ok: false, error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  let body: DraftBody;
  try {
    body = (await request.json()) as DraftBody;
  } catch {
    return Response.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  if (body.company_website) return Response.json({ ok: true });

  const token = clean(body.token, 64);
  const title = clean(body.title, LIMITS.title);
  const draftBody = clean(body.body, LIMITS.body);
  const authorName = clean(body.authorName, LIMITS.authorName);
  const authorBio = clean(body.authorBio, LIMITS.authorBio);

  if (!token) {
    return Response.json({ ok: false, error: "Missing invite." }, { status: 401 });
  }
  if (!title || !draftBody) {
    return Response.json({ ok: false, error: "A title and a draft are both needed." }, { status: 400 });
  }
  if (draftBody.length < 500) {
    return Response.json(
      { ok: false, error: "That's shorter than we can work with. Send the full draft." },
      { status: 400 },
    );
  }

  const client = getWriteClient();
  if (!client) {
    return Response.json(
      {
        ok: false,
        error:
          "Submissions aren't connected yet. Reply to the email that sent you this link instead.",
      },
      { status: 503 },
    );
  }

  const pitch = await groqFetch<{
    _id: string;
    name?: string;
    email?: string;
    status?: string;
    inviteExpires?: string;
  } | null>(client, pitchByTokenQuery, { token });

  /* One message for every failure mode. Distinguishing "no such token" from
   * "expired token" would let someone probe for valid tokens by reading the
   * difference. Shared with the page that renders the form — see lib/guest.ts. */
  if (!isInviteValid(pitch)) {
    return Response.json(
      { ok: false, error: "This invite link isn't valid any more." },
      { status: 401 },
    );
  }

  try {
    await client.create({
      _type: "guestDraft",
      title,
      body: draftBody,
      authorName: authorName || pitch.name || "Guest contributor",
      authorEmail: pitch.email ?? "",
      authorBio,
      pitch: { _type: "reference", _ref: pitch._id },
      status: "received",
      submittedAt: new Date().toISOString(),
    });

    /* Burns the invite. Ordered after the create on purpose: if the patch fails
     * the draft still exists and the owner sees it, whereas burning first would
     * risk a writer losing their work to a transient error. */
    await client.patch(pitch._id).set({ status: "drafted" }).commit();
  } catch {
    return Response.json(
      { ok: false, error: "That didn't send. Reply to the email that sent you this link." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}
