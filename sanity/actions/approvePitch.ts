/* Subpath imports — @sanity/icons v5's barrel exports only `Icon` and `icons`.
 * See the note in sanity/structure.ts. */
import { CheckmarkCircleIcon } from "@sanity/icons/CheckmarkCircle";
import { CloseCircleIcon } from "@sanity/icons/CloseCircle";
import { useState } from "react";
import { useClient, type DocumentActionComponent } from "sanity";
import { SANITY_API_VERSION } from "@/lib/env";

/* Step 2 of the guest pipeline: approving a pitch mints the invite.
 *
 * The whole reason the pipeline has two steps is that the public form
 * (/write-for-us) has to be open to strangers, and anything open to strangers
 * is open to bots. So the public endpoint accepts a few short fields, and the
 * endpoint that accepts a whole article is unreachable without the token this
 * action generates. Spam can fill the pitch queue; it cannot fill the draft
 * queue, and it can never reach the site.
 *
 * The token is single-use and expiring by design:
 *   · single-use — the draft endpoint sets status to "drafted", after which the
 *     token no longer validates. One invite, one submission.
 *   · expiring — an invite left open forever is a permanent unauthenticated
 *     write endpoint that nobody remembers issuing.
 *
 * crypto.randomUUID() is cryptographically random, so the token cannot be
 * guessed or enumerated from a known pitch.
 */

const INVITE_DAYS = 21;

/* PascalCase because these ARE React components in Sanity's model — the Studio
 * calls them during render and they may use hooks (useClient, useState). The
 * react-hooks/rules-of-hooks lint rule identifies components by their initial
 * capital, and a camelCase name here makes every hook call an error. */
export const ApprovePitchAction: DocumentActionComponent = (props) => {
  const client = useClient({ apiVersion: SANITY_API_VERSION });
  const [busy, setBusy] = useState(false);

  const doc = props.published as
    | { _id?: string; status?: string; inviteToken?: string; email?: string }
    | undefined;

  if (props.type !== "guestPitch") return null;
  /* Already approved: show the invite link instead of offering to mint a
   * second one, which would silently invalidate the first. */
  if (doc?.status === "approved" || doc?.status === "drafted") {
    return {
      label: "Invite issued",
      icon: CheckmarkCircleIcon,
      disabled: true,
      title: doc?.inviteToken
        ? `Send them: /blog/submit/${doc.inviteToken}`
        : "Invite already issued",
    };
  }
  if (doc?.status === "declined") return null;

  return {
    label: busy ? "Issuing…" : "Approve & issue link",
    icon: CheckmarkCircleIcon,
    tone: "positive",
    disabled: busy || !doc?._id,
    onHandle: async () => {
      if (!doc?._id) return;
      setBusy(true);
      const token = crypto.randomUUID().replace(/-/g, "");
      const expires = new Date(
        Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();

      await client
        .patch(doc._id)
        .set({ status: "approved", inviteToken: token, inviteExpires: expires })
        .commit();

      setBusy(false);
      props.onComplete();
    },
  };
};

export const DeclinePitchAction: DocumentActionComponent = (props) => {
  const client = useClient({ apiVersion: SANITY_API_VERSION });
  const doc = props.published as { _id?: string; status?: string } | undefined;

  if (props.type !== "guestPitch") return null;
  if (doc?.status === "declined") return null;

  return {
    label: "Decline",
    icon: CloseCircleIcon,
    tone: "critical",
    disabled: !doc?._id,
    onHandle: async () => {
      if (!doc?._id) return;
      /* Clearing the token matters: declining a pitch that was previously
       * approved has to revoke the invite, not just relabel the document. */
      await client
        .patch(doc._id)
        .set({ status: "declined" })
        .unset(["inviteToken", "inviteExpires"])
        .commit();
      props.onComplete();
    },
  };
};
