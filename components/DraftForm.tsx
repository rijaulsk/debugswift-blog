"use client";

import { useRef, useState } from "react";
import { variantClasses } from "@/components/Button";
import { track } from "@/lib/analytics";
import { API } from "@/lib/links";
import { CONTACT_EMAIL } from "@/lib/site";

/* The invited draft form, behind a token.
 *
 * The token is carried in the URL and posted back for the server to re-check.
 * The page that rendered this form already validated it, and that validation is
 * NOT trusted here — /api/draft revalidates on every request, because a form
 * rendered once and submitted an hour later is a different question from a
 * page load.
 *
 * Plain text / markdown, not a rich editor. Deliberate: a string cannot carry a
 * block type, an asset reference or a mark annotation into the content model,
 * so there is no path from this textarea to anything structural. Converting it
 * into real blocks is a Studio action the owner runs after reading it. */

const fieldClass =
  "mt-2 w-full rounded-card border-[1.5px] border-ink bg-paper px-4 py-3 text-ink placeholder:text-stone focus:outline-none focus-visible:border-indigo-600";
const labelClass = "block font-medium text-ink";

export default function DraftForm({
  token,
  writerName,
}: {
  token: string;
  writerName: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [words, setWords] = useState(0);
  const trapRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (trapRef.current?.value) return;

    const form = new FormData(e.currentTarget);
    setState("sending");
    setError("");

    try {
      const res = await fetch(API.draft, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          title: form.get("title"),
          body: form.get("body"),
          authorName: form.get("authorName"),
          authorBio: form.get("authorBio"),
          company_website: form.get("company_website"),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong.");

      setState("done");
      void track("draft_submit", { location: "submit" });
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-card border-[1.5px] border-ink bg-sand p-6">
        <p className="text-eyebrow uppercase text-indigo-600">Draft received</p>
        <p className="mt-3 text-h3 text-ink">That&apos;s with us now.</p>
        <p className="mt-3 text-slate">
          We&apos;ll read it, edit for structure and clarity, and send the edit
          back before anything goes live. This link has now been used, so
          don&apos;t worry if it stops working.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <input
        ref={trapRef}
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <div>
        <label htmlFor="draft-title" className={labelClass}>
          Title
        </label>
        <input id="draft-title" name="title" required maxLength={120} className={fieldClass} />
      </div>

      <div>
        <label htmlFor="draft-body" className={labelClass}>
          The draft
        </label>
        <p className="mt-1 text-small text-slate">
          Plain text or markdown. <code>##</code> for headings, <code>-</code> for
          bullets. Don&apos;t worry about formatting beyond that; we handle the
          rest.
        </p>
        <textarea
          id="draft-body"
          name="body"
          required
          rows={24}
          maxLength={60000}
          onChange={(e) => setWords(e.target.value.split(/\s+/).filter(Boolean).length)}
          className={`${fieldClass} font-mono text-small`}
        />
        <p className="mt-2 text-small text-slate">
          {words} words
          {words > 0 && words < 800 && ", aiming for 800–1,500"}
          {words > 1500 && ", over 1,500, consider cutting"}
        </p>
      </div>

      <div>
        <label htmlFor="draft-author" className={labelClass}>
          Byline name
        </label>
        <input
          id="draft-author"
          name="authorName"
          defaultValue={writerName}
          maxLength={80}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="draft-bio" className={labelClass}>
          Author bio
        </label>
        <p className="mt-1 text-small text-slate">
          Two or three sentences: who you are and why you can speak to this.
          Links in here are nofollow, as agreed.
        </p>
        <textarea
          id="draft-bio"
          name="authorBio"
          rows={4}
          maxLength={600}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={state === "sending"}
          className={`${variantClasses.primary} disabled:opacity-60`}
        >
          {state === "sending" ? "Sending…" : "Submit the draft"}
        </button>
        {state === "error" && (
          <p className="text-small text-danger">
            {error} Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>{" "}
            and send it that way. Don&apos;t lose the draft.
          </p>
        )}
      </div>
    </form>
  );
}
