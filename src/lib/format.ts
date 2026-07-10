export function formatDateTime(d: Date | null): string {
  if (!d) return "Time TBD";
  return new Date(d).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
