/* Dates, formatted the same way everywhere.
 *
 * en-GB with an explicit UTC timezone, and that second part matters: without it
 * the server renders the date in the build machine's zone and the browser
 * renders it in the reader's, so a post published late in the day flips by one
 * between the HTML and the hydrated output. React reports that as a hydration
 * mismatch, and the fix people usually reach for is suppressHydrationWarning,
 * which hides the symptom and keeps the wrong date. */
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return dateFormatter.format(date);
}

/** For <time dateTime="…"> — the machine-readable half. */
export function isoDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
