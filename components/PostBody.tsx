import {
  PortableText,
  type PortableTextComponents,
  type PortableTextMarkComponentProps,
} from "@portabletext/react";
import Image from "next/image";
import FaqList from "@/components/FaqList";
import { cloudinaryUrl, type CloudinaryAsset } from "@/sanity/lib/cloudinary";
import { headingId } from "@/lib/portableText";
import { MAIN, publicAsset, SITE_URL } from "@/lib/links";
import { getService } from "@/lib/nav";
import type { BodyBlock } from "@/lib/types";

/* The post body.
 *
 * A server component with no client JavaScript in it at all — including the
 * FAQ accordion, which is a native <details>/<summary> rather than a React
 * one. That is not minimalism for its own sake: an accordion whose answers only
 * exist after hydration is an accordion whose answers a crawler may not read,
 * and FAQ content that isn't in the HTML cannot win the result it was written
 * for. <details> keeps every answer in the DOM, costs nothing, and works with
 * JavaScript switched off.
 *
 * Styling comes entirely from the design tokens in app/globals.css. No raw
 * hexes, no shadows, no gradients — the anti-AI checklist applies to post
 * bodies exactly as it does to marketing pages. */

type Props = {
  value: BodyBlock[];
  /** Forces rel="nofollow ugc" on every outbound link. Set from author.isGuest. */
  isGuest?: boolean;
};

/* The link that appears beside a heading on hover or keyboard focus.
 *
 * The ids were already there — they are what earns "jump to section" links in a
 * search result — but nothing let a reader link to one, which is the other half
 * of the same idea: someone quoting a specific section should be able to point
 * at it. It stays focusable and labelled rather than aria-hidden, because a
 * keyboard user has exactly the same need as a mouse user here. */
function HeadingAnchor({ id }: { id: string }) {
  return (
    <a
      href={`#${id}`}
      aria-label="Link to this section"
      className="ml-2 align-middle text-[0.7em] font-normal text-indigo-500 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 focus-visible:opacity-100"
    >
      #
    </a>
  );
}

function isExternal(href: string): boolean {
  if (href.startsWith("/") || href.startsWith("#")) return false;
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  return !href.startsWith(SITE_URL);
}

export default function PostBody({ value, isGuest = false }: Props) {
  /* Heading ids are generated with the same dedup rule as extractHeadings() in
   * lib/portableText.ts, so the table of contents and the anchors it points at
   * cannot drift apart. PortableText renders blocks in document order, so a
   * closure counter is enough — but the two implementations must be changed
   * together if the rule ever changes. */
  const seen = new Map<string, number>();
  const idFor = (text: string) => {
    const base = headingId(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };

  const textOf = (children: React.ReactNode): string =>
    Array.isArray(children)
      ? children.map((c) => (typeof c === "string" ? c : "")).join("")
      : typeof children === "string"
        ? children
        : "";

  const components: PortableTextComponents = {
    block: {
      normal: ({ children }) => (
        <p className="mt-6 text-ink first:mt-0">{children}</p>
      ),
      h2: ({ children }) => {
        const id = idFor(textOf(children));
        return (
          <h2 id={id} className="group mt-14 scroll-mt-28 text-h2 text-ink">
            {children}
            <HeadingAnchor id={id} />
          </h2>
        );
      },
      h3: ({ children }) => {
        const id = idFor(textOf(children));
        return (
          <h3 id={id} className="group mt-10 scroll-mt-28 text-h3 text-ink">
            {children}
            <HeadingAnchor id={id} />
          </h3>
        );
      },
      /* Indigo rule on the leading edge, not a grey box — quotes are an
       * emphasis, and a filled panel would read as a second card surface. */
      blockquote: ({ children }) => (
        <blockquote className="mt-8 border-l-[3px] border-indigo-500 pl-5 text-ink italic">
          {children}
        </blockquote>
      ),
    },

    list: {
      bullet: ({ children }) => (
        <ul className="mt-6 list-disc space-y-2 pl-6 marker:text-indigo-500">
          {children}
        </ul>
      ),
      number: ({ children }) => (
        <ol className="mt-6 list-decimal space-y-2 pl-6 marker:font-medium marker:text-indigo-600">
          {children}
        </ol>
      ),
    },
    listItem: {
      bullet: ({ children }) => <li className="text-ink">{children}</li>,
      number: ({ children }) => <li className="text-ink">{children}</li>,
    },

    marks: {
      strong: ({ children }) => <strong className="font-bold">{children}</strong>,
      em: ({ children }) => <em className="italic">{children}</em>,
      code: ({ children }) => (
        <code className="rounded bg-sand px-1.5 py-0.5 font-mono text-[0.9em] text-ink">
          {children}
        </code>
      ),
      link: ({
        value,
        children,
      }: PortableTextMarkComponentProps<{ _type: string; href?: string; nofollow?: boolean }>) => {
        const href = value?.href ?? "#";
        const external = isExternal(href);
        /* Guest posts: nofollow ugc on everything outbound, no exceptions and
         * no per-link override. That switch is the reason a guest section can
         * exist without turning the domain into a link farm — see
         * sanity/schemaTypes/author.ts. */
        const rel = external
          ? [
              "noopener",
              ...(isGuest || value?.nofollow ? ["nofollow", "ugc"] : []),
            ].join(" ")
          : undefined;
        return (
          <a
            href={href}
            rel={rel}
            {...(external ? { target: "_blank" } : {})}
            className="font-medium text-indigo-600 underline underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700"
          >
            {children}
          </a>
        );
      },
    },

    types: {
      figure: ({ value }) => {
        const asset = value?.asset as CloudinaryAsset | undefined;
        if (!asset?.public_id) return null;
        return (
          <figure className="mt-10">
            <Image
              /* Cloudinary returns an absolute URL, which publicAsset passes
               * through untouched — wrapped anyway so the rule is uniform and
               * a future local figure can't reintroduce the basePath bug. */
              src={publicAsset(cloudinaryUrl(asset.public_id, { width: 1400 }))}
              alt={value.alt ?? ""}
              width={asset.width ?? 1400}
              height={asset.height ?? 933}
              sizes="(max-width: 768px) 100vw, 720px"
              className="rounded-card border-[1.5px] border-ink"
            />
            {value.caption && (
              <figcaption className="mt-3 text-small text-slate">
                {value.caption}
              </figcaption>
            )}
          </figure>
        );
      },

      calloutBlock: ({ value }) => (
        <aside
          className={`mt-10 rounded-card border-[1.5px] p-6 ${
            value.tone === "warning"
              ? "border-clay-600 bg-clay-50"
              : "border-ink bg-sand"
          }`}
        >
          {value.title && (
            <p className="text-eyebrow uppercase text-indigo-600">{value.title}</p>
          )}
          <p className={`text-ink${value.title ? " mt-2" : ""}`}>{value.text}</p>
        </aside>
      ),

      faqBlock: ({ value }) => (
        <div className="mt-12">
          <FaqList items={value.items ?? []} />
        </div>
      ),

      stepsBlock: ({ value }) => (
        <div className="mt-12">
          {value.title && <p className="text-h3 text-ink">{value.title}</p>}
          {/* Ledger numbering — the design system's list treatment. The number
           * is a real element, not a ::marker, so it can carry its own colour
           * and weight without fighting the list style. */}
          <ol className="mt-6 space-y-6">
            {(value.steps ?? []).map(
              (step: { _key?: string; title: string; text?: string }, i: number) => (
                <li key={step._key ?? i} className="flex gap-4">
                  <span className="mt-0.5 shrink-0 text-eyebrow uppercase text-indigo-600 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-medium text-ink">{step.title}</p>
                    {step.text && <p className="mt-1 text-slate">{step.text}</p>}
                  </div>
                </li>
              ),
            )}
          </ol>
        </div>
      ),

      comparisonTable: ({ value }) => (
        <figure className="mt-12">
          {/* The table scrolls inside its own box rather than pushing the page
           * sideways — a body that scrolls horizontally on a phone is broken. */}
          <div className="overflow-x-auto rounded-card border-[1.5px] border-ink">
            <table className="w-full min-w-[34rem] border-collapse text-left">
              <thead>
                <tr className="border-b-[1.5px] border-ink bg-sand">
                  {(value.columns ?? []).map((col: string) => (
                    <th key={col} className="px-4 py-3 text-eyebrow uppercase text-ink">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(value.rows ?? []).map(
                  (row: { _key?: string; cells?: string[] }, i: number) => (
                    <tr key={row._key ?? i} className="border-b border-mist last:border-0">
                      {(row.cells ?? []).map((cell, j) => (
                        <td
                          key={j}
                          className={`px-4 py-3 align-top text-small ${
                            j === 0 ? "font-medium text-ink" : "text-slate"
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
          {value.caption && (
            <figcaption className="mt-3 text-small text-slate">{value.caption}</figcaption>
          )}
        </figure>
      ),

      serviceLink: ({ value }) => {
        const slug = value.serviceSlug as string;
        const isLeadEngine = slug === "lead-engine";
        const service = isLeadEngine ? null : getService(slug);
        const name = isLeadEngine ? "The Lead Engine" : service?.name;
        if (!name) return null;
        const href = isLeadEngine ? MAIN.leadEngine : MAIN.service(slug);
        return (
          <aside className="mt-12 rounded-card border-[1.5px] border-ink bg-paper p-6">
            <p className="text-eyebrow uppercase text-indigo-600">Related service</p>
            <p className="mt-2 text-h3 text-ink">{name}</p>
            <p className="mt-2 text-slate">{value.blurb}</p>
            {/* Main site, so a bare <a> — next/link would prefix basePath. */}
            <a
              href={href}
              className="mt-4 inline-flex items-center font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
            >
              See what&apos;s involved →
            </a>
          </aside>
        );
      },

      sourcedStat: ({ value }) => (
        <figure className="mt-12 border-l-[3px] border-clay-500 pl-5">
          <p className="text-display-mobile text-ink">{value.value}</p>
          <p className="mt-1 text-ink">{value.label}</p>
          {/* The source is rendered, not just stored. A number without visible
           * provenance is exactly the invented proof the honesty rules ban. */}
          <figcaption className="mt-2 text-small text-slate">
            Source:{" "}
            <a
              href={value.sourceUrl}
              target="_blank"
              rel="noopener nofollow"
              className="underline underline-offset-4 hover:text-indigo-600"
            >
              {value.sourceLabel}
            </a>
          </figcaption>
        </figure>
      ),

      codeBlock: ({ value }) => (
        <pre className="mt-10 overflow-x-auto rounded-card border-[1.5px] border-ink bg-charcoal p-5 text-small text-cream">
          <code>{value.code}</code>
        </pre>
      ),
    },
  };

  return (
    <div className="text-body">
      <PortableText value={value} components={components} />
    </div>
  );
}
