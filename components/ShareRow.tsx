"use client";

import { useState } from "react";
import { LinkedInIcon, WhatsAppIcon, XIcon } from "@/components/icons";
import { track } from "@/lib/analytics";

/* Share links.
 *
 * Plain hrefs to each network's own share endpoint — no SDKs, no embedded
 * buttons, no third-party JavaScript. Official share widgets each cost a script
 * load, a frame, and a tracker on every post that carries them, and they buy a
 * count nobody acts on.
 *
 * "Copy link" is the only part that needs JavaScript, and it degrades: if the
 * Clipboard API is unavailable or blocked the button reports the failure rather
 * than showing "Copied!" over an empty clipboard. */
export default function ShareRow({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const targets = [
    {
      name: "X",
      Icon: XIcon,
      href: `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      name: "LinkedIn",
      Icon: LinkedInIcon,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      name: "WhatsApp",
      Icon: WhatsAppIcon,
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied("done");
      void track("post_share", { location: "post:share", label: "copy" });
    } catch {
      setCopied("failed");
    }
    window.setTimeout(() => setCopied("idle"), 2500);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-eyebrow uppercase text-indigo-600">Share</span>
      {targets.map(({ name, Icon, href }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener"
          aria-label={`Share on ${name}`}
          onClick={() => void track("post_share", { location: "post:share", label: name })}
          className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-ink text-ink transition-colors duration-200 ease-out hover:bg-sand"
        >
          <Icon size={16} />
        </a>
      ))}
      <button
        type="button"
        onClick={copy}
        className="rounded-full border-[1.5px] border-ink px-4 py-2 text-small font-medium text-ink transition-colors duration-200 ease-out hover:bg-sand"
      >
        {copied === "done"
          ? "Link copied"
          : copied === "failed"
            ? "Couldn't copy — select the address bar"
            : "Copy link"}
      </button>
    </div>
  );
}
