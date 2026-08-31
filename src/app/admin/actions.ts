"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as mutations from "@/db/mutations";
import { requireAdmin } from "@/lib/auth-guard";
import {
  AGE_GROUPS,
  AREAS,
  GENDERS,
  RATING_TYPES,
  SKILL_LEVELS,
} from "@/lib/constants";

export type ActionState = { error?: string; ok?: boolean };

const LEAGUE_STATUSES = ["draft", "active", "completed"] as const;

function parseDate(value: FormDataEntryValue | null): Date | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseStatus(formData: FormData) {
  const raw = String(formData.get("status") ?? "draft").trim();
  return LEAGUE_STATUSES.includes(raw as (typeof LEAGUE_STATUSES)[number])
    ? (raw as (typeof LEAGUE_STATUSES)[number])
    : "draft";
}

// ---------- Leagues (seasons) ----------

function parseLeagueForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "League name is required." as const };

  const seasonStart = parseDate(formData.get("seasonStart"));
  const seasonEnd = parseDate(formData.get("seasonEnd"));
  if (seasonStart && seasonEnd && seasonEnd < seasonStart) {
    return { error: "Season end can't be before season start." as const };
  }

  return {
    data: { name, status: parseStatus(formData), seasonStart, seasonEnd },
  };
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

export async function deleteLeagueAction(
  leagueId: string,
): Promise<ActionState> {
  await requireAdmin();
  try {
    await mutations.deleteLeague(leagueId);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not delete the league.",
    };
  }
  revalidatePath("/admin");
  redirect("/admin");
}

// ---------- Divisions ----------

function parseDivisionForm(formData: FormData) {
  const ratingType = String(formData.get("ratingType") ?? "").trim();
  if (!RATING_TYPES.includes(ratingType as (typeof RATING_TYPES)[number])) {
    return { error: "Please pick a rating type." as const };
  }
  const rating = String(formData.get("rating") ?? "").trim();
  if (!rating) return { error: "Rating is required." as const };
  if (
    ratingType === "single" &&
    !SKILL_LEVELS.includes(rating as (typeof SKILL_LEVELS)[number])
  ) {
    return { error: "Please pick a valid skill level." as const };
  }
  if (ratingType === "combo" && !/^\d+(\.\d+)?$/.test(rating)) {
    return { error: "Combo rating must be a number (e.g. 8.5)." as const };
  }

  const gender = String(formData.get("gender") ?? "").trim();
  if (!GENDERS.includes(gender as (typeof GENDERS)[number])) {
    return { error: "Please pick a gender." as const };
  }
  const ageGroup = String(formData.get("ageGroup") ?? "").trim();
  if (!AGE_GROUPS.includes(ageGroup as (typeof AGE_GROUPS)[number])) {
    return { error: "Please pick an age group." as const };
  }

  const name = String(formData.get("name") ?? "").trim() || null;
  const seasonStart = parseDate(formData.get("seasonStart"));
  const seasonEnd = parseDate(formData.get("seasonEnd"));
  if (seasonStart && seasonEnd && seasonEnd < seasonStart) {
    return { error: "Season end can't be before season start." as const };
  }

  return {
    data: {
      name,
      rating,
      ratingType: ratingType as (typeof RATING_TYPES)[number],
      gender: gender as (typeof GENDERS)[number],
      ageGroup,
      status: parseStatus(formData),
      seasonStart,
      seasonEnd,
    },
  };
}

export async function createDivisionAction(
  leagueId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseDivisionForm(formData);
  if (parsed.error) return { error: parsed.error };

  await mutations.createDivision(leagueId, parsed.data);
  revalidatePath(`/admin/leagues/${leagueId}`);
  return { ok: true };
}

export async function updateDivisionAction(
  divisionId: string,
  leagueId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseDivisionForm(formData);
  if (parsed.error) return { error: parsed.error };

  await mutations.updateDivision(divisionId, parsed.data);
  revalidatePath(`/admin/leagues/${leagueId}`);
  revalidatePath(`/admin/divisions/${divisionId}`);
  return { ok: true };
}

export async function deleteDivisionAction(
  divisionId: string,
  leagueId: string,
): Promise<ActionState> {
  await requireAdmin();
  try {
    await mutations.deleteDivision(divisionId);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not delete the division.",
    };
  }
  revalidatePath(`/admin/leagues/${leagueId}`);
  redirect(`/admin/leagues/${leagueId}`);
}

// ---------- Teams (within a division) ----------

export async function createTeamAction(
  divisionId: string,
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
    divisionId,
    name,
    area,
    rosterCap,
    captainEmail: captainEmail || null,
  });
  revalidatePath(`/admin/divisions/${divisionId}`);
  return { ok: true };
}

export async function deleteTeamAction(divisionId: string, teamId: string) {
  await requireAdmin();
  await mutations.deleteTeam(teamId);
  revalidatePath(`/admin/divisions/${divisionId}`);
}

export async function updateTeamAction(
  divisionId: string,
  teamId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Team name is required." };

  const area = String(formData.get("area") ?? "").trim();
  if (!AREAS.includes(area as (typeof AREAS)[number])) {
    return { error: "Please pick an area." };
  }

  const capRaw = String(formData.get("rosterCap") ?? "").trim();
  const rosterCap = capRaw ? Number(capRaw) : null;
  if (rosterCap !== null && (!Number.isInteger(rosterCap) || rosterCap < 1)) {
    return { error: "Roster cap must be a positive whole number." };
  }

  await mutations.updateTeam(teamId, { name, area, rosterCap });
  revalidatePath(`/admin/divisions/${divisionId}`);
  return { ok: true };
}

export async function assignCaptainAction(
  divisionId: string,
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
  revalidatePath(`/admin/divisions/${divisionId}`);
  return { ok: true };
}

export async function addPlayerAction(
  divisionId: string,
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
  revalidatePath(`/admin/divisions/${divisionId}`);
  return { ok: true };
}

// ---------- Division scheduling ----------

export type ScheduleActionResult = { error?: string; message?: string };

function revalidateSchedule(divisionId: string) {
  revalidatePath(`/admin/divisions/${divisionId}`);
  revalidatePath(`/divisions/${divisionId}`);
  revalidatePath("/dashboard");
}

export async function generateScheduleAction(
  divisionId: string,
  meetings: number,
): Promise<ScheduleActionResult> {
  await requireAdmin();
  let created: number;
  try {
    created = await mutations.generateDivisionSchedule(divisionId, meetings);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not generate the schedule.",
    };
  }
  revalidateSchedule(divisionId);
  return {
    message: `Schedule created — ${created} match${created === 1 ? "" : "es"}.`,
  };
}

export async function clearScheduleAction(
  divisionId: string,
): Promise<ScheduleActionResult> {
  await requireAdmin();
  try {
    await mutations.clearDivisionSchedule(divisionId);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not clear the schedule.",
    };
  }
  revalidateSchedule(divisionId);
  return { message: "Schedule cleared." };
}
