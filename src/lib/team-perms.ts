import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { teamMemberships } from "@/db/schema";
import type { Session } from "./auth";

export async function getActiveTeamRole(userId: string, teamId: string) {
  const [membership] = await db
    .select({ role: teamMemberships.role })
    .from(teamMemberships)
    .where(
      and(
        eq(teamMemberships.userId, userId),
        eq(teamMemberships.teamId, teamId),
        eq(teamMemberships.status, "active"),
      ),
    )
    .limit(1);
  return membership?.role ?? null;
}

/** Captain, co-captain, or admin — can manage the roster and requests. */
export async function canManageTeam(
  session: Session | null,
  teamId: string,
): Promise<boolean> {
  if (!session) return false;
  if (session.user.role === "admin") return true;
  const role = await getActiveTeamRole(session.user.id, teamId);
  return role === "captain" || role === "co_captain";
}

/** Captain or admin only — can change who holds the co-captain role. */
export async function canManageLeadership(
  session: Session | null,
  teamId: string,
): Promise<boolean> {
  if (!session) return false;
  if (session.user.role === "admin") return true;
  return (await getActiveTeamRole(session.user.id, teamId)) === "captain";
}
