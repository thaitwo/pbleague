"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as mutations from "@/db/mutations";
import { getMatch } from "@/db/queries";
import { getSession, requireUser } from "@/lib/auth-guard";
import {
  notifyJoinRequested,
  notifyMatchAccepted,
  notifyMatchProposed,
  notifyRequestApproved,
  notifyScoreDisputed,
  notifyScoreEntered,
} from "@/lib/notifications";
import { canManageLeadership, canManageTeam } from "@/lib/team-perms";

export type RowActionResult = { error?: string; message?: string };

function fail(message: string): RowActionResult {
  return { error: message };
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong.";
}

function revalidateTeam(teamId: string) {
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/dashboard");
  revalidatePath("/leagues");
}

export async function requestToJoinAction(
  teamId: string,
): Promise<RowActionResult> {
  const session = await requireUser();
  try {
    await mutations.requestToJoin(teamId, session.user.id);
  } catch (e) {
    return fail(errorMessage(e));
  }
  revalidateTeam(teamId);
  await notifyJoinRequested(teamId, session.user.name).catch(() => {});
  return { message: "Request sent — a captain will review it." };
}

export async function approveRequestAction(
  teamId: string,
  membershipId: string,
): Promise<RowActionResult> {
  const session = await getSession();
  if (!(await canManageTeam(session, teamId))) {
    return fail("You don't have permission to manage this team.");
  }
  try {
    await mutations.approveMembership(teamId, membershipId);
  } catch (e) {
    return fail(errorMessage(e));
  }
  revalidateTeam(teamId);
  await notifyRequestApproved(teamId, membershipId).catch(() => {});
  return { message: "Player added to the roster." };
}

export async function declineRequestAction(
  teamId: string,
  membershipId: string,
): Promise<RowActionResult> {
  const session = await getSession();
  if (!(await canManageTeam(session, teamId))) {
    return fail("You don't have permission to manage this team.");
  }
  try {
    await mutations.declineMembership(teamId, membershipId);
  } catch (e) {
    return fail(errorMessage(e));
  }
  revalidateTeam(teamId);
  return { message: "Request declined." };
}

export async function removeMemberAction(
  teamId: string,
  membershipId: string,
): Promise<RowActionResult> {
  const session = await getSession();
  if (!(await canManageTeam(session, teamId))) {
    return fail("You don't have permission to manage this team.");
  }
  try {
    await mutations.removeMember(teamId, membershipId);
  } catch (e) {
    return fail(errorMessage(e));
  }
  revalidateTeam(teamId);
  return { message: "Member removed." };
}

export async function promoteCoCaptainAction(
  teamId: string,
  membershipId: string,
): Promise<RowActionResult> {
  const session = await getSession();
  if (!(await canManageLeadership(session, teamId))) {
    return fail("Only the captain or an admin can set the co-captain.");
  }
  try {
    await mutations.setCoCaptain(teamId, membershipId);
  } catch (e) {
    return fail(errorMessage(e));
  }
  revalidateTeam(teamId);
  return { message: "Co-captain updated." };
}

export async function demoteCoCaptainAction(
  teamId: string,
  membershipId: string,
): Promise<RowActionResult> {
  const session = await getSession();
  if (!(await canManageLeadership(session, teamId))) {
    return fail("Only the captain or an admin can change the co-captain.");
  }
  try {
    await mutations.demoteCoCaptain(teamId, membershipId);
  } catch (e) {
    return fail(errorMessage(e));
  }
  revalidateTeam(teamId);
  return { message: "Co-captain removed." };
}

export async function regenerateInviteAction(
  teamId: string,
): Promise<RowActionResult & { token?: string }> {
  const session = await getSession();
  if (!(await canManageTeam(session, teamId))) {
    return fail("You don't have permission to manage this team.");
  }
  try {
    const token = await mutations.regenerateInviteToken(teamId);
    revalidateTeam(teamId);
    return { token, message: "Invite link ready." };
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function acceptInviteAction(token: string): Promise<RowActionResult> {
  const session = await requireUser();
  let result: { teamId: string; alreadyMember: boolean };
  try {
    result = await mutations.acceptInvite(token, session.user.id);
  } catch (e) {
    return fail(errorMessage(e));
  }
  revalidateTeam(result.teamId);
  redirect(`/teams/${result.teamId}`);
}

// ---------- Phase 4: scheduling ----------

function parseWhen(value: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error("Enter a valid date and time.");
  return d;
}

function revalidateMatch(homeTeamId: string, awayTeamId: string) {
  revalidatePath(`/teams/${homeTeamId}`);
  revalidatePath(`/teams/${awayTeamId}`);
  revalidatePath("/dashboard");
}

function responderTeamId(match: {
  homeTeamId: string;
  awayTeamId: string;
  proposedByTeamId: string | null;
}) {
  return match.proposedByTeamId === match.homeTeamId
    ? match.awayTeamId
    : match.homeTeamId;
}

export async function proposeMatchAction(
  proposingTeamId: string,
  opponentTeamId: string,
  when: string,
  location: string,
): Promise<RowActionResult> {
  const session = await getSession();
  if (!(await canManageTeam(session, proposingTeamId))) {
    return fail("You don't have permission to schedule for this team.");
  }
  let scheduledAt: Date;
  try {
    scheduledAt = parseWhen(when);
  } catch (e) {
    return fail(errorMessage(e));
  }
  let match: Awaited<ReturnType<typeof mutations.proposeMatch>>;
  try {
    match = await mutations.proposeMatch({
      proposingTeamId,
      opponentTeamId,
      scheduledAt,
      location: location.trim() || null,
    });
  } catch (e) {
    return fail(errorMessage(e));
  }
  revalidateMatch(proposingTeamId, opponentTeamId);
  await notifyMatchProposed(match.id).catch(() => {});
  return { message: "Match proposed — the other captain will respond." };
}

export async function acceptMatchAction(
  matchId: string,
): Promise<RowActionResult> {
  const session = await getSession();
  const match = await getMatch(matchId);
  if (!match) return fail("Match not found.");
  if (!(await canManageTeam(session, responderTeamId(match)))) {
    return fail("Only the team that was invited can accept this proposal.");
  }
  try {
    await mutations.acceptMatch(matchId);
  } catch (e) {
    return fail(errorMessage(e));
  }
  revalidateMatch(match.homeTeamId, match.awayTeamId);
  await notifyMatchAccepted(matchId).catch(() => {});
  return { message: "Match confirmed on the schedule." };
}

export async function counterMatchAction(
  matchId: string,
  respondingTeamId: string,
  when: string,
  location: string,
): Promise<RowActionResult> {
  const session = await getSession();
  const match = await getMatch(matchId);
  if (!match) return fail("Match not found.");
  if (respondingTeamId === match.proposedByTeamId) {
    return fail("It's the other team's turn to respond.");
  }
  if (!(await canManageTeam(session, respondingTeamId))) {
    return fail("You don't have permission to respond for this team.");
  }
  let scheduledAt: Date;
  try {
    scheduledAt = parseWhen(when);
  } catch (e) {
    return fail(errorMessage(e));
  }
  try {
    await mutations.counterMatch(
      matchId,
      respondingTeamId,
      scheduledAt,
      location.trim() || null,
    );
  } catch (e) {
    return fail(errorMessage(e));
  }
  revalidateMatch(match.homeTeamId, match.awayTeamId);
  return { message: "Counter-proposal sent." };
}

export async function cancelMatchAction(
  matchId: string,
): Promise<RowActionResult> {
  const session = await getSession();
  const match = await getMatch(matchId);
  if (!match) return fail("Match not found.");
  const allowed =
    (await canManageTeam(session, match.homeTeamId)) ||
    (await canManageTeam(session, match.awayTeamId));
  if (!allowed) {
    return fail("You don't have permission to cancel this match.");
  }
  try {
    await mutations.cancelMatch(matchId);
  } catch (e) {
    return fail(errorMessage(e));
  }
  revalidateMatch(match.homeTeamId, match.awayTeamId);
  return { message: "Match cancelled." };
}

// ---------- Phase 5: scores ----------

type GameInput = { homeScore: number; awayScore: number };

function revalidateScored(match: {
  homeTeamId: string;
  awayTeamId: string;
  leagueId: string;
}) {
  revalidatePath(`/teams/${match.homeTeamId}`);
  revalidatePath(`/teams/${match.awayTeamId}`);
  revalidatePath(`/leagues/${match.leagueId}`);
  revalidatePath("/leagues");
  revalidatePath("/dashboard");
}

function confirmingTeamId(match: {
  homeTeamId: string;
  awayTeamId: string;
  scoreEnteredByTeamId: string | null;
}) {
  return match.scoreEnteredByTeamId === match.homeTeamId
    ? match.awayTeamId
    : match.homeTeamId;
}

export async function enterScoreAction(
  matchId: string,
  enteringTeamId: string,
  games: GameInput[],
): Promise<RowActionResult> {
  const session = await getSession();
  if (!session || !(await canManageTeam(session, enteringTeamId))) {
    return fail("You don't have permission to record a score for this team.");
  }
  const match = await getMatch(matchId);
  if (!match) return fail("Match not found.");
  try {
    await mutations.enterScore(matchId, enteringTeamId, games, session.user.id);
  } catch (e) {
    return fail(errorMessage(e));
  }
  revalidateScored(match);
  await notifyScoreEntered(matchId).catch(() => {});
  return { message: "Score recorded — waiting for the other team to confirm." };
}

export async function confirmScoreAction(
  matchId: string,
): Promise<RowActionResult> {
  const session = await getSession();
  const match = await getMatch(matchId);
  if (!match) return fail("Match not found.");
  if (!session || !(await canManageTeam(session, confirmingTeamId(match)))) {
    return fail("Only the opposing team can confirm this score.");
  }
  try {
    await mutations.confirmScore(matchId, session.user.id);
  } catch (e) {
    return fail(errorMessage(e));
  }
  revalidateScored(match);
  return { message: "Score confirmed — it now counts toward the standings." };
}

export async function disputeScoreAction(
  matchId: string,
): Promise<RowActionResult> {
  const session = await getSession();
  const match = await getMatch(matchId);
  if (!match) return fail("Match not found.");
  if (!session || !(await canManageTeam(session, confirmingTeamId(match)))) {
    return fail("Only the opposing team can dispute this score.");
  }
  try {
    await mutations.disputeScore(matchId);
  } catch (e) {
    return fail(errorMessage(e));
  }
  revalidateScored(match);
  await notifyScoreDisputed(matchId).catch(() => {});
  return { message: "Score disputed — an admin will review it." };
}

export async function resolveScoreAction(
  matchId: string,
  games: GameInput[],
): Promise<RowActionResult> {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    return fail("Only an admin can resolve a disputed score.");
  }
  const match = await getMatch(matchId);
  if (!match) return fail("Match not found.");
  try {
    await mutations.resolveScore(matchId, games, session.user.id);
  } catch (e) {
    return fail(errorMessage(e));
  }
  revalidateScored(match);
  return { message: "Score resolved and confirmed." };
}
