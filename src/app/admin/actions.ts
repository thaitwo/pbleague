"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as mutations from "@/db/mutations";
import { requireAdmin } from "@/lib/auth-guard";
import { AREAS, SKILL_LEVELS } from "@/lib/constants";

export type ActionState = { error?: string; ok?: boolean };

const LEAGUE_STATUSES = ["draft", "active", "completed"] as const;

function parseDate(value: FormDataEntryValue | null): Date | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseLeagueForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const skillLevel = String(formData.get("skillLevel") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "draft").trim();

  if (!name) return { error: "League name is required." as const };
  if (!SKILL_LEVELS.includes(skillLevel as (typeof SKILL_LEVELS)[number])) {
    return { error: "Please pick a valid skill level." as const };
  }
  const status = LEAGUE_STATUSES.includes(
    statusRaw as (typeof LEAGUE_STATUSES)[number],
  )
    ? (statusRaw as (typeof LEAGUE_STATUSES)[number])
    : "draft";

  const seasonStart = parseDate(formData.get("seasonStart"));
  const seasonEnd = parseDate(formData.get("seasonEnd"));
  if (seasonStart && seasonEnd && seasonEnd < seasonStart) {
    return { error: "Season end can't be before season start." as const };
  }

  return { data: { name, skillLevel, status, seasonStart, seasonEnd } };
}

export async function createLeagueAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseLeagueForm(formData);
  if (parsed.error) return { error: parsed.error };

  const league = await mutations.createLeague(parsed.data);
  revalidatePath("/admin");
  redirect(`/admin/leagues/${league.id}`);
}

export async function updateLeagueAction(
  leagueId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseLeagueForm(formData);
  if (parsed.error) return { error: parsed.error };

  await mutations.updateLeague(leagueId, parsed.data);
  revalidatePath("/admin");
  revalidatePath(`/admin/leagues/${leagueId}`);
  return { ok: true };
}

export async function deleteLeagueAction(leagueId: string) {
  await requireAdmin();
  await mutations.deleteLeague(leagueId);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function createTeamAction(
  leagueId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Team name is required." };

  const capRaw = String(formData.get("rosterCap") ?? "").trim();
  const rosterCap = capRaw ? Number(capRaw) : null;
  if (rosterCap !== null && (!Number.isInteger(rosterCap) || rosterCap < 1)) {
    return { error: "Roster cap must be a positive whole number." };
  }

  const area = String(formData.get("area") ?? "").trim();
  if (!AREAS.includes(area as (typeof AREAS)[number])) {
    return { error: "Please pick an area." };
  }

  const captainEmail = String(formData.get("captainEmail") ?? "").trim();
  if (captainEmail && !captainEmail.includes("@")) {
    return { error: "Captain email looks invalid." };
  }

  await mutations.createTeam({
    leagueId,
    name,
    area,
    rosterCap,
    captainEmail: captainEmail || null,
  });
  revalidatePath(`/admin/leagues/${leagueId}`);
  return { ok: true };
}

export async function deleteTeamAction(leagueId: string, teamId: string) {
  await requireAdmin();
  await mutations.deleteTeam(teamId);
  revalidatePath(`/admin/leagues/${leagueId}`);
}

export async function assignCaptainAction(
  leagueId: string,
  teamId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const email = String(formData.get("captainEmail") ?? "").trim();
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }
  await mutations.assignRoleByEmail(teamId, email, "captain");
  revalidatePath(`/admin/leagues/${leagueId}`);
  return { ok: true };
}

export async function addPlayerAction(
  leagueId: string,
  teamId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const email = String(formData.get("playerEmail") ?? "").trim();
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }
  await mutations.assignRoleByEmail(teamId, email, "player");
  revalidatePath(`/admin/leagues/${leagueId}`);
  return { ok: true };
}
