import { NextResponse } from "next/server";
import { autoConfirmStaleScores } from "@/db/mutations";

// Confirms any score left unconfirmed for 72h. Wire this to a Vercel cron
// (e.g. daily) in vercel.ts. If CRON_SECRET is set, require it as a Bearer token.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const confirmed = await autoConfirmStaleScores();
  return NextResponse.json({ confirmed });
}
