/* What makes a guest invite valid.
 *
 * One definition, used by both places that need it: the page that renders the
 * draft form (app/submit/[token]/page.tsx) and the endpoint that accepts the
 * submission (app/api/draft/route.ts). Those two ran the same three checks
 * written out twice, which is precisely the kind of duplication where one copy
 * later gains a condition the other doesn't — and the endpoint is the one that
 * actually matters.
 *
 * It also lives outside a component on purpose: this reads the clock, and a
 * Server Component that calls Date.now() during render trips react-hooks/purity.
 * The rule is a false positive for a dynamic server render, but a plain
 * function is the better shape anyway.
 */

export type InvitePitch = {
  status?: string;
  inviteExpires?: string;
};

/**
 * True only for an approved, unexpired invite.
 *
 * A type guard, not a boolean: both callers go on to read fields off the pitch,
 * and narrowing here means neither needs a non-null assertion to do it. Generic
 * over T so each caller keeps its own richer shape (one needs `email`, the
 * other `topicIdea`) instead of being widened to this minimum.
 *
 * Callers must not distinguish between the failure modes in what they show the
 * user. "No such token", "declined", "expired" and "already used" all have to
 * read identically, or the difference becomes a way to probe for live tokens.
 */
export function isInviteValid<T extends InvitePitch>(
  pitch: T | null | undefined,
  now: number = Date.now(),
): pitch is T {
  if (!pitch) return false;
  /* Approving mints the token; submitting a draft flips the pitch to "drafted",
   * which is what makes the invite single-use. */
  if (pitch.status !== "approved") return false;
  if (pitch.inviteExpires && Date.parse(pitch.inviteExpires) < now) return false;
  return true;
}
