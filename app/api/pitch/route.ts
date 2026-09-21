import { getWriteClient } from "@/sanity/lib/client";
import { clientKey, rateLimit } from "@/lib/rateLimit";

/* Step 1 of the guest pipeline: a stranger proposes a post.
 *
 * This is the ONLY endpoint in the app the public can write through, so it is
 * deliberately the narrowest thing that can still be useful: five short fields,
 * hard length caps, no rich content, no file uploads, no HTML. There is no path
 * from this request to a block type, an asset reference, or a mark annotation —
 * a submission is strings, and strings are all it can ever be.
 *
 * The article itself arrives at /api/draft, which is unreachable without an
 * invite token the owner mints by approving one of these. Spam can fill this
 * queue. It cannot reach the draft queue, and nothing reaches the site without
 * a human pressing publish.
 *
 * Three cheap filters run before the write:
 *   · honeypot — a field no human sees, that every naive bot fills in
 *   · dwell time — a form submitted in under two seconds was not typed
 *   · rate limit — see lib/rateLimit.ts for what that is and isn't worth
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMITS = {
  name: 80,
  email: 160,
  topicIdea: 160,
  angle: 2000,
  bio: 600,
  sampleUrl: 300,
  samples: 5,
};

type PitchBody = {
  name?: string;
  email?: string;
  topicIdea?: string;
  angle?: string;
  bio?: string;
  samples?: string[];
  /** Honeypot. Any value at all means a bot. */
  company_website?: string;
  /** Milliseconds the form was on screen before submitting. */
  elapsedMs?: number;
};

const clean = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/* Not RFC 5322 — that regex is famously unusable and rejects valid addresses.
 * This only rejects what is obviously not an address; the real validation is
 * that a human reads the pitch before anything happens. */
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function POST(request: Request) {
  const limited = rateLimit(`pitch:${clientKey(request)}`, {
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    return Response.json(
      { ok: false, error: "Too many pitches from this connection. Try again later." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  let body: PitchBody;
  try {
    body = (await request.json()) as PitchBody;
  } catch {
    return Response.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  /* Bots get 200 OK. Telling one it was detected is telling its author which
   * field to stop filling in — a silent no-op costs nothing and teaches
   * nothing. Nothing is written. */
  if (body.company_website) return Response.json({ ok: true });
  if (typeof body.elapsedMs === "number" && body.elapsedMs < 2000) {
    return Response.json({ ok: true });
  }

  const name = clean(body.name, LIMITS.name);
  const email = clean(body.email, LIMITS.email);
  const topicIdea = clean(body.topicIdea, LIMITS.topicIdea);
  const angle = clean(body.angle, LIMITS.angle);
  const bio = clean(body.bio, LIMITS.bio);
  const samples = Array.isArray(body.samples)
    ? body.samples
        .map((url) => clean(url, LIMITS.sampleUrl))
        .filter((url) => /^https?:\/\//.test(url))
        .slice(0, LIMITS.samples)
    : [];

  if (!name || !email || !topicIdea || !angle) {
    return Response.json(
      { ok: false, error: "Name, email, topic and angle are all needed." },
      { status: 400 },
    );
  }
  if (!looksLikeEmail(email)) {
    return Response.json({ ok: false, error: "That email doesn't look right." }, { status: 400 });
  }
  if (angle.length < 120) {
    /* The angle is the entire basis for a yes or no. Two sentences is not a
     * pitch, and asking for more here costs a serious writer nothing. */
    return Response.json(
      { ok: false, error: "Tell us a bit more about the angle: a paragraph at least." },
      { status: 400 },
    );
  }

  const client = getWriteClient();
  if (!client) {
    /* Fails loudly rather than showing a thank-you for a pitch that went
     * nowhere. Same rule as the main site's diagnosis form: never report
     * success for something that wasn't delivered. */
    return Response.json(
      {
        ok: false,
        error:
          "Submissions aren't connected yet. Email hello@debugswift.com and it'll reach the same place.",
      },
      { status: 503 },
    );
  }

  try {
    await client.create({
      _type: "guestPitch",
      name,
      email,
      topicIdea,
      angle,
      bio,
      samples,
      status: "new",
      submittedAt: new Date().toISOString(),
    });
  } catch {
    return Response.json(
      { ok: false, error: "That didn't send. Email hello@debugswift.com instead." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}
