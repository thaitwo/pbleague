import { headers } from "next/headers";

/** Best-effort absolute base URL for building links in emails. */
export async function getBaseUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  try {
    const h = await headers();
    const host = h.get("host");
    if (host) return `${h.get("x-forwarded-proto") ?? "http"}://${host}`;
  } catch {
    // headers() unavailable outside a request (e.g. cron) — fall through
  }
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}
