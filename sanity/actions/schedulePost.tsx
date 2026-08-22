import { CalendarIcon } from "@sanity/icons/Calendar";
import { CloseCircleIcon } from "@sanity/icons/CloseCircle";
import { useState } from "react";
import { useClient, useValidationStatus, type DocumentActionComponent } from "sanity";

import { SANITY_API_VERSION } from "@/lib/env";

/* Schedule a post to publish itself later.
 *
 * WHY THIS EXISTS AT ALL. Sanity's own scheduled publishing is a Growth-plan
 * feature (~$15/seat/month) and the plugin that used to provide it is
 * deprecated in favour of Content Releases, also Growth+. The standing rule is
 * no fixed costs before revenue, so the scheduling UI is ours: this action and
 * the scheduledFor field. A job outside the Studio presses Publish when the
 * time arrives — see scripts/publish-due.ts.
 *
 * THE GATE IS HERE, NOT IN THE JOB. The action refuses to queue a post that
 * would fail validation, which means the cover and the originality check must
 * already be done. That is what keeps the honesty rule intact: scheduling is a
 * deliberate human act with the same preconditions as pressing Publish, and the
 * job that fires later has no judgement to exercise — it publishes what a person
 * already approved, or it publishes nothing.
 *
 * The job re-checks anyway. Between scheduling and firing somebody could unset
 * the cover, and a queue that trusts a decision made a week ago is a queue that
 * publishes a broken post at 6am.
 */

/** Minutes of slack, so "schedule for 5 minutes' time" is not a race with the
 *  next job run. */
const MIN_LEAD_MINUTES = 2;

const localInputValue = (date: Date): string => {
  /* datetime-local wants the value in the viewer's own timezone with no
   * offset marker, so the usual toISOString() would silently shift it. */
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const SchedulePostAction: DocumentActionComponent = (props) => {
  const client = useClient({ apiVersion: SANITY_API_VERSION });
  /* The DRAFT id, not props.id — props.id is the published id, and validating
   * that would grade the live post rather than the pending edit being queued.
   * Sanity's own publish action does exactly this. The third argument requires
   * referenced documents to be published, which is what stops a post being
   * queued against a topic that itself only exists as a draft. */
  const { validation, isValidating } = useValidationStatus(
    `drafts.${props.id}`,
    props.type,
    true,
  );
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [when, setWhen] = useState(() =>
    localInputValue(new Date(Date.now() + 60 * 60 * 1000)),
  );
  const [error, setError] = useState<string | null>(null);

  if (props.type !== "post") return null;

  const draft = props.draft as { _id?: string; scheduledFor?: string } | null;
  const published = props.published as { _id?: string } | null;

  /* Only an unpublished draft can be queued. A post that is already live has
   * nothing to schedule — an edit to it is a normal Publish. */
  if (!draft) return null;

  const errors = validation.filter((marker) => marker.level === "error");

  if (draft.scheduledFor) {
    const at = new Date(draft.scheduledFor);
    return {
      label: busy ? "Cancelling…" : `Scheduled — ${at.toLocaleString()}`,
      icon: CloseCircleIcon,
      tone: "caution",
      title: "Cancel this schedule and leave it as an ordinary draft",
      disabled: busy,
      onHandle: async () => {
        setBusy(true);
        await client.patch(draft._id!).unset(["scheduledFor", "scheduledBy"]).commit();
        setBusy(false);
        props.onComplete();
      },
    };
  }

  return {
    label: "Schedule for…",
    icon: CalendarIcon,
    /* Disabled while the document would not publish. The tooltip says which
     * rule is in the way, because "disabled with no reason" is the single most
     * annoying thing a CMS can do. */
    disabled: isValidating || errors.length > 0 || busy,
    title: errors.length
      ? `Cannot schedule yet — ${errors[0]?.message ?? "the post has validation errors"}`
      : "Publish this automatically at a time you choose",
    onHandle: () => setOpen(true),
    dialog: open && {
      type: "dialog",
      header: "Schedule this post",
      onClose: () => {
        setOpen(false);
        setError(null);
        props.onComplete();
      },
      content: (
        <div style={{ display: "grid", gap: 12, padding: 4 }}>
          <label
            htmlFor="ds-schedule-at"
            style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}
          >
            Publish at
          </label>
          <input
            id="ds-schedule-at"
            type="datetime-local"
            value={when}
            min={localInputValue(new Date())}
            onChange={(event) => {
              setWhen(event.currentTarget.value);
              setError(null);
            }}
            style={{
              font: "inherit",
              padding: "8px 10px",
              border: "1px solid #ced2d9",
              borderRadius: 4,
            }}
          />
          <p style={{ fontSize: 12, lineHeight: 1.5, margin: 0, color: "#6b7280" }}>
            Your local time. The post goes live within about ten minutes of this,
            and its publish date is set to the time you choose here.
          </p>
          {error ? (
            <p style={{ fontSize: 12, margin: 0, color: "#b91c1c" }}>{error}</p>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const at = new Date(when);
              if (Number.isNaN(at.getTime())) {
                setError("That is not a date.");
                return;
              }
              if (at.getTime() < Date.now() + MIN_LEAD_MINUTES * 60 * 1000) {
                setError(
                  `Pick a time at least ${MIN_LEAD_MINUTES} minutes from now, or just press Publish.`,
                );
                return;
              }

              setBusy(true);
              await client
                .patch(draft._id!)
                .set({
                  scheduledFor: at.toISOString(),
                  scheduledBy: "studio",
                  /* The publish date IS the scheduled time. Leaving the old one
                   * would date the post to whenever it was drafted. */
                  publishedAt: at.toISOString(),
                })
                .commit();
              setBusy(false);
              setOpen(false);
              props.onComplete();
            }}
            style={{
              font: "inherit",
              fontWeight: 600,
              padding: "8px 14px",
              borderRadius: 4,
              border: "1px solid #221d17",
              background: "#e87d4a",
              color: "#221d17",
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "Scheduling…" : published ? "Schedule this update" : "Schedule"}
          </button>
        </div>
      ),
    },
  };
};
