import Link from "next/link";
import { BLOG } from "@/lib/links";

/* Numbered pagination, rendered as real links.
 *
 * Real <a> hrefs, not buttons and not infinite scroll: a crawler that cannot
 * reach page four cannot index anything on it, and infinite scroll makes
 * everything past the first screen invisible to search entirely. Every page is
 * one hop from every other, so nothing is ever more than a click deep. */
export default function Pagination({
  page,
  total,
}: {
  page: number;
  total: number;
}) {
  if (total <= 1) return null;

  const pages = Array.from({ length: total }, (_, i) => i + 1);
  const base =
    "flex h-10 min-w-10 items-center justify-center rounded-full border-[1.5px] px-3 text-small font-medium transition-colors duration-200 ease-out";

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={BLOG.page(page - 1)} className={`${base} border-ink text-ink hover:bg-sand`}>
          ← Newer
        </Link>
      )}

      {pages.map((n) =>
        n === page ? (
          <span
            key={n}
            aria-current="page"
            className={`${base} border-ink bg-ink text-cream`}
          >
            {n}
          </span>
        ) : (
          <Link
            key={n}
            href={BLOG.page(n)}
            className={`${base} border-mist text-slate hover:border-ink hover:text-ink`}
          >
            {n}
          </Link>
        ),
      )}

      {page < total && (
        <Link href={BLOG.page(page + 1)} className={`${base} border-ink text-ink hover:bg-sand`}>
          Older →
        </Link>
      )}
    </nav>
  );
}
