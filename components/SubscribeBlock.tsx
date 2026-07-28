"use client";

import { useEffect, useRef, useState } from "react";
import { variantClasses } from "@/components/Button";
import { track } from "@/lib/analytics";
import { CONTACT_EMAIL, WEB3FORMS_ACCESS_KEY } from "@/lib/site";

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

/* Email capture.
 *
 * Same delivery route as the main site's diagnosis form: a direct browser POST
 * to Web3Forms with FormData. Not a choice — Web3Forms sits behind a Cloudflare
 * bot challenge that only a real browser clears, so every server-to-server POST
 * comes back 403. The access key is public by design; the note in lib/site.ts
 * explains why that is fine.
 *
 * THE RULE THIS SHARES WITH THE DIAGNOSIS FORM: never report success for
 * something that wasn't delivered. Web3Forms answers 200 with success:false for
 * a rejected key, so the HTTP status alone proves nothing — both conditions
 * have to hold. On failure the reader gets the email address instead of a
 * cheerful lie.
 *
 * The microcopy promises no schedule, because there isn't one. "Weekly
 * insights" from a blog with one post is the first small lie a reader catches. */
export default function SubscribeBlock({ location }: { location: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  /* Honeypot + dwell time. Bots fill every field and submit instantly; humans
   * do neither. Costs nothing and adds no friction to a real reader. */
  const trapRef = useRef<HTMLInputElement>(null);
  /* Stamped in an effect rather than as useRef(Date.now()): a ref initialiser
   * runs during render, and calling an impure function there is exactly the
   * kind of thing that produces different values on a re-render. Zero until
   * mounted, and the check below treats zero as "don't know, allow". */
  const mountedAt = useRef(0);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    if (trapRef.current?.value) return;
    if (mountedAt.current && Date.now() - mountedAt.current < 2000) return;

    setState("sending");
    try {
      const formData = new FormData();
      formData.append("access_key", WEB3FORMS_ACCESS_KEY);
      formData.append("subject", "Blog subscriber");
      formData.append("from_name", "DebugSwift blog");
      formData.append("email", email.trim());
      formData.append("message", `New blog subscriber: ${email.trim()} (from ${location})`);

      const res = await fetch(WEB3FORMS_ENDPOINT, { method: "POST", body: formData });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean };

      /* Both, always. See the note above. */
      if (!res.ok || !data.success) throw new Error(String(res.status));

      setState("done");
      setEmail("");
      void track("subscribe_submit", { location });
    } catch {
      setState("error");
      void track("subscribe_error", { location });
    }
  }

  return (
    <section className="rounded-card border-[1.5px] border-ink bg-sand p-6 md:p-8">
      <p className="text-eyebrow uppercase text-indigo-600">New posts by email</p>
      <h2 className="mt-3 max-w-lg text-h3 text-ink">
        One email when something worth reading goes up.
      </h2>
      <p className="mt-3 max-w-xl text-small text-slate">
        No schedule, no newsletter filler, no selling your address on. If a month
        goes by with nothing worth sending, nothing gets sent.
      </p>

      {state === "done" ? (
        <p className="mt-6 font-medium text-ink">
          You&apos;re on the list. Next post lands in your inbox.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6">
          {/* Honeypot: off-screen rather than display:none, and aria-hidden +
           * tabIndex -1 so no real user or screen reader ever meets it. */}
          <input
            ref={trapRef}
            type="text"
            name="company_website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="subscribe-email" className="sr-only">
              Email address
            </label>
            <input
              id="subscribe-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourbusiness.com"
              autoComplete="email"
              className="w-full rounded-full border-[1.5px] border-ink bg-paper px-5 py-3 text-ink placeholder:text-stone focus:outline-none focus-visible:border-indigo-600"
            />
            <button
              type="submit"
              disabled={state === "sending"}
              className={`${variantClasses.primary} shrink-0 disabled:opacity-60`}
            >
              {state === "sending" ? "Sending…" : "Send me new posts"}
            </button>
          </div>

          {state === "error" && (
            <p className="mt-3 text-small text-danger">
              That didn&apos;t send — which we&apos;d rather tell you than pretend.
              Email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              and we&apos;ll add you by hand.
            </p>
          )}
        </form>
      )}
    </section>
  );
}
