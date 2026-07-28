/* Index pagination.
 *
 * 12 per page: three rows of four on desktop, and small enough that page one
 * stays fast on a phone. Page 1 lives at /blog, not /blog/page/1 — two URLs
 * listing the same posts is duplicate content, and /page/1 redirects rather
 * than rendering (see app/page/[n]/page.tsx). */
export const POSTS_PER_PAGE = 12;

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
}

export function pageSlice<T>(items: T[], page: number): T[] {
  const start = (page - 1) * POSTS_PER_PAGE;
  return items.slice(start, start + POSTS_PER_PAGE);
}
