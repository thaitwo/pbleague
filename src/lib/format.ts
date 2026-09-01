/** A date as mm/dd/yy (e.g. 07/22/26). Returns null when there's no date. */
export function formatDate(d: Date | null): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });
}

/** A date + time as mm/dd/yy, h:mm AM/PM. Falls back to "Time TBD". */
export function formatDateTime(d: Date | null): string {
  if (!d) return "Time TBD";
  return new Date(d).toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** A season date range as "mm/dd/yy – mm/dd/yy" (or open-ended / undefined). */
export function seasonLabel(
  start: Date | null,
  end: Date | null,
): string | undefined {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return `Starts ${s}`;
  if (e) return `Ends ${e}`;
  return undefined;
}
