"use client";

import { useEffect, useRef, useState } from "react";
import { variantClasses } from "@/components/Button";
import { track } from "@/lib/analytics";
import { API } from "@/lib/links";
import { CONTACT_EMAIL } from "@/lib/site";

/* The public pitch form.
 *
 * Five fields, because five fields is what /api/pitch accepts — the endpoint is
 * narrow by design and this form matches it exactly rather than collecting
 * things the server will throw away.
 *
 * It never claims success it didn't get: the button says "sent" only after the
 * API returned ok, and any failure hands over the email address instead. Same
 * rule as the main site's diagnosis form and the subscribe block. */

const fieldClass =
  "mt-2 w-full rounded-card border-[1.5px] border-ink bg-paper px-4 py-3 text-ink placeholder:text-stone focus:outline-none focus-visible:border-indigo-600";
const labelClass = "block font-medium text-ink";

export default function PitchForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const trapRef = useRef<HTMLInputElement>(null);
  /* Stamped in an effect, not in the ref initialiser: initialisers run during
   * render, and Date.now() there is an impure call that can differ between
   * renders. The server sends elapsedMs and the API treats 0 as "unknown". */
  const mountedAt = useRef(0);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (trapRef.current?.value) return;

    const form = new FormData(e.currentTarget);
    setState("sending");
    setError("");

    try {
      const res = await fetch(API.pitch, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          topicIdea: form.get("topicIdea"),
          angle: form.get("angle"),
          bio: form.get("bio"),
          samples: [form.get("sample1"), form.get("sample2"), form.get("sample3")].filter(
            Boolean,
          ),
          company_website: form.get("company_website"),
          /* 0 means the effect never ran, which the API reads as "unknown"
           * rather than "instant" — it must not fail a real submission. */
          elapsedMs: mountedAt.current ? Date.now() - mountedAt.current : undefined,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong.");

      setState("done");
      void track("pitch_submit", { location: "write-for-us" });
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
      void track("pitch_error", { location: "write-for-us" });
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-card border-[1.5px] border-ink bg-sand p-6">
        <p className="text-eyebrow uppercase text-indigo-600">Pitch received</p>
        <p className="mt-3 text-h3 text-ink">We&apos;ll read it properly.</p>
        <p className="mt-3 text-slate">
          If it&apos;s a fit you&apos;ll get a reply with a link to send the full
          draft. If it isn&apos;t, you&apos;ll get a reply saying so — we
          don&apos;t leave people wondering.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Honeypot — off-screen, hidden from AT, out of the tab order. */}
      <input
        ref={trapRef}
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="pitch-name" className={labelClass}>
            Your name
          </label>
          <input id="pitch-name" name="name" required maxLength={80} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="pitch-email" className={labelClass}>
            Email
          </label>
          <input
            id="pitch-email"
            name="email"
            type="email"
            required
            maxLength={160}
            autoComplete="email"
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="pitch-topic" className={labelClass}>
          The question your post answers
        </label>
        <p className="mt-1 text-small text-stone">
          Phrased the way an owner would ask it. &ldquo;Why does my spreadsheet
          keep breaking?&rdquo; — not &ldquo;5 productivity hacks&rdquo;.
        </p>
        <input
          id="pitch-topic"
          name="topicIdea"
          required
          maxLength={160}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="pitch-angle" className={labelClass}>
          What you&apos;d argue, and why you can
        </label>
        <p className="mt-1 text-small text-stone">
          A paragraph or two. The specific thing you know that most people
          writing about this don&apos;t.
        </p>
        <textarea
          id="pitch-angle"
          name="angle"
          required
          rows={7}
          maxLength={2000}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="pitch-bio" className={labelClass}>
          A line about you
        </label>
        <textarea id="pitch-bio" name="bio" rows={3} maxLength={600} className={fieldClass} />
      </div>

      <fieldset>
        <legend className={labelClass}>Something you&apos;ve published</legend>
        <p className="mt-1 text-small text-stone">
          Up to three links. Anything you wrote — it doesn&apos;t have to be
          about this.
        </p>
        <div className="mt-2 space-y-3">
          {["sample1", "sample2", "sample3"].map((name, i) => (
            <div key={name}>
              <label htmlFor={`pitch-${name}`} className="sr-only">
                Published work link {i + 1}
              </label>
              <input
                id={`pitch-${name}`}
                name={name}
                type="url"
                placeholder="https://"
                maxLength={300}
                className={`${fieldClass} mt-0`}
              />
            </div>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={state === "sending"}
          className={`${variantClasses.primary} disabled:opacity-60`}
        >
          {state === "sending" ? "Sending…" : "Send the pitch"}
        </button>
        {state === "error" && (
          <p className="text-small text-danger">
            {error} Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>{" "}
            and it&apos;ll reach the same place.
          </p>
        )}
      </div>
    </form>
  );
}
