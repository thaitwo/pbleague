import { randomBytes } from "node:crypto";
import { and, count, eq, isNull, lt, ne, sql } from "drizzle-orm";
import { db } from "./index";
import {
  leagues,
  matchGames,
  matches,
  teamMemberships,
  teams,
  user,
} from "./schema";

type LeagueInput = {
  name: string;
  skillLevel: string;
  seasonStart: Date | null;
  seasonEnd: Date | null;
  status?: "draft" | "active" | "completed";
};

export async function createLeague(input: LeagueInput) {
  const [league] = await db.insert(leagues).values(input).returning();
  return league;
}

export async function updateLeague(id: string, input: LeagueInput) {
  const [league] = await db
    .update(leagues)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(leagues.id, id))
    .returning();
  return league;
}

export async function deleteLeague(id: string) {
  await db.delete(leagues).where(eq(leagues.id, id));
}

type TeamInput = {
  leagueId: string;
  name: string;
  rosterCap: number | null;
  captainEmail?: string | null;
};

export async function createTeam({ captainEmail, ...input }: TeamInput) {
  const [team] = await db.insert(teams).values(input).returning();
  if (captainEmail && captainEmail.trim()) {
    await assignRoleByEmail(team.id, captainEmail, "captain");
  }
  return team;
}

export async function updateTeam(
  id: string,
  input: { name: string; rosterCap: number | null },
) {
  const [team] = await db
    .update(teams)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(teams.id, id))
    .returning();
  return team;
}

export async function deleteTeam(id: string) {
  await db.delete(teams).where(eq(teams.id, id));
}

/**
 * Adds a member to a team by email with the given role. Works whether or not the
 * person already has an account: if they do, we link their user id; if not, we
 * store the invited email and it gets claimed on sign-up (see claimInvitesForUser).
 * The captain/co-captain roles are singular per team, so any current holder is
 * demoted to player; the player role has no such limit.
 */
export async function assignRoleByEmail(
  teamId: string,
  email: string,
  role: "captain" | "co_captain" | "player",
) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error("Email is required.");

  const [targetUser] = await db
    .select()
    .from(user)
    .where(sql`lower(${user.email}) = ${normalized}`)
    .limit(1);

  // Captain/co-captain are singular per team — demote whoever currently holds it.
  if (role !== "player") {
    await db
      .update(teamMemberships)
      .set({ role: "player", updatedAt: new Date() })
      .where(
        and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.role, role)),
      );
  }

  // Does this person already have a membership on the team?
  const [existing] = targetUser
    ? await db
        .select()
        .from(teamMemberships)
        .where(
          and(
            eq(teamMemberships.teamId, teamId),
            eq(teamMemberships.userId, targetUser.id),
          ),
        )
        .limit(1)
    : await db
        .select()
        .from(teamMemberships)
        .where(
          and(
            eq(teamMemberships.teamId, teamId),
            sql`lower(${teamMemberships.invitedEmail}) = ${normalized}`,
          ),
        )
        .limit(1);

  if (existing) {
    await db
      .update(teamMemberships)
      .set({ role, status: "active", updatedAt: new Date() })
      .where(eq(teamMemberships.id, existing.id));
    return;
  }

  await db.insert(teamMemberships).values({
    teamId,
    userId: targetUser?.id ?? null,
    invitedEmail: targetUser ? null : normalized,
    role,
    status: "active",
  });
}

export async function removeMembership(id: string) {
  await db.delete(teamMemberships).where(eq(teamMemberships.id, id));
}

/**
 * Links any pending email invitations to a newly created account.
 * Called from the Better Auth user-create hook.
 */
export async function claimInvitesForUser(userId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  await db
    .update(teamMemberships)
    .set({ userId, invitedEmail: null, updatedAt: new Date() })
    .where(
      and(
        sql`lower(${teamMemberships.invitedEmail}) = ${normalized}`,
        isNull(teamMemberships.userId),
      ),
    );
}

// ---------- Phase 3: rosters ----------

async function activeMemberCount(teamId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(teamMemberships)
    .where(
      and(
        eq(teamMemberships.teamId, teamId),
        eq(teamMemberships.status, "active"),
      ),
    );
  return Number(row?.n ?? 0);
}

async function assertHasCapacity(teamId: string) {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!team) throw new Error("Team not found.");
  if (team.rosterCap != null && (await activeMemberCount(teamId)) >= team.rosterCap) {
    throw new Error("This team's roster is full.");
  }
}

async function loadMembershipInTeam(membershipId: string, teamId: string) {
  const [membership] = await db
    .select()
    .from(teamMemberships)
    .where(eq(teamMemberships.id, membershipId))
    .limit(1);
  if (!membership || membership.teamId !== teamId) {
    throw new Error("That member isn't part of this team.");
  }
  return membership;
}

export async function requestToJoin(teamId: string, userId: string) {
  const [existing] = await db
    .select()
    .from(teamMemberships)
    .where(
      and(
        eq(teamMemberships.teamId, teamId),
        eq(teamMemberships.userId, userId),
        ne(teamMemberships.status, "removed"),
      ),
    )
    .limit(1);
  if (existing) {
    throw new Error(
      existing.status === "active"
        ? "You're already on this team."
        : "Your request to join is already pending.",
    );
  }
  await db.insert(teamMemberships).values({
    teamId,
    userId,
    role: "player",
    status: "pending",
  });
}

export async function approveMembership(teamId: string, membershipId: string) {
  const membership = await loadMembershipInTeam(membershipId, teamId);
  if (membership.status !== "pending") {
    throw new Error("That request is no longer pending.");
  }
  await assertHasCapacity(teamId);
  await db
    .update(teamMemberships)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(teamMemberships.id, membershipId));
}

export async function declineMembership(teamId: string, membershipId: string) {
  const membership = await loadMembershipInTeam(membershipId, teamId);
  if (membership.status !== "pending") {
    throw new Error("That request is no longer pending.");
  }
  await db.delete(teamMemberships).where(eq(teamMemberships.id, membershipId));
}

export async function removeMember(teamId: string, membershipId: string) {
  const membership = await loadMembershipInTeam(membershipId, teamId);
  if (membership.role === "captain") {
    throw new Error("You can't remove the team captain.");
  }
  await db.delete(teamMemberships).where(eq(teamMemberships.id, membershipId));
}

export async function setCoCaptain(teamId: string, membershipId: string) {
  const membership = await loadMembershipInTeam(membershipId, teamId);
  if (membership.status !== "active") {
    throw new Error("Only active members can be made co-captain.");
  }
  if (membership.role === "captain") {
    throw new Error("That member is the captain.");
  }
  // Co-captain is singular per team — demote the current one first.
  await db
    .update(teamMemberships)
    .set({ role: "player", updatedAt: new Date() })
    .where(
      and(
        eq(teamMemberships.teamId, teamId),
        eq(teamMemberships.role, "co_captain"),
      ),
    );
  await db
    .update(teamMemberships)
    .set({ role: "co_captain", updatedAt: new Date() })
    .where(eq(teamMemberships.id, membershipId));
}

export async function demoteCoCaptain(teamId: string, membershipId: string) {
  const membership = await loadMembershipInTeam(membershipId, teamId);
  if (membership.role !== "co_captain") {
    throw new Error("That member isn't a co-captain.");
  }
  await db
    .update(teamMemberships)
    .set({ role: "player", updatedAt: new Date() })
    .where(eq(teamMemberships.id, membershipId));
}

export async function regenerateInviteToken(teamId: string) {
  const token = randomBytes(16).toString("hex");
  await db
    .update(teams)
    .set({ inviteToken: token, updatedAt: new Date() })
    .where(eq(teams.id, teamId));
  return token;
}

export async function acceptInvite(token: string, userId: string) {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.inviteToken, token))
    .limit(1);
  if (!team) {
    throw new Error("This invite link is invalid or has been revoked.");
  }

  const [existing] = await db
    .select()
    .from(teamMemberships)
    .where(
      and(
        eq(teamMemberships.teamId, team.id),
        eq(teamMemberships.userId, userId),
        ne(teamMemberships.status, "removed"),
      ),
    )
    .limit(1);

  if (existing?.status === "active") {
    return { teamId: team.id, alreadyMember: true };
  }

  await assertHasCapacity(team.id);
  if (existing) {
    // A pending request is auto-approved by using the invite link.
    await db
      .update(teamMemberships)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(teamMemberships.id, existing.id));
  } else {
    await db.insert(teamMemberships).values({
      teamId: team.id,
      userId,
      role: "player",
      status: "active",
    });
  }
  return { teamId: team.id, alreadyMember: false };
}

// ---------- Phase 4: scheduling ----------

const CANCELLABLE = ["proposed", "scheduled"] as const;

export async function proposeMatch(input: {
  proposingTeamId: string;
  opponentTeamId: string;
  scheduledAt: Date;
  location: string | null;
}) {
  if (input.proposingTeamId === input.opponentTeamId) {
    throw new Error("Pick a different team as the opponent.");
  }
  const [proposing] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, input.proposingTeamId))
    .limit(1);
  if (!proposing) throw new Error("Your team was not found.");
  const [opponent] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, input.opponentTeamId))
    .limit(1);
  if (!opponent) throw new Error("Opponent team not found.");
  if (opponent.leagueId !== proposing.leagueId) {
    throw new Error("You can only schedule matches within your own league.");
  }

  const [match] = await db
    .insert(matches)
    .values({
      leagueId: proposing.leagueId,
      homeTeamId: proposing.id,
      awayTeamId: opponent.id,
      proposedByTeamId: proposing.id,
      scheduledAt: input.scheduledAt,
      location: input.location,
      status: "proposed",
    })
    .returning();
  return match;
}

export async function acceptMatch(matchId: string) {
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) throw new Error("Match not found.");
  if (match.status !== "proposed") {
    throw new Error("This proposal is no longer open.");
  }
  await db
    .update(matches)
    .set({ status: "scheduled", updatedAt: new Date() })
    .where(eq(matches.id, matchId));
}

export async function counterMatch(
  matchId: string,
  respondingTeamId: string,
  scheduledAt: Date,
  location: string | null,
) {
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) throw new Error("Match not found.");
  if (match.status !== "proposed") {
    throw new Error("This proposal is no longer open.");
  }
  if (
    respondingTeamId !== match.homeTeamId &&
    respondingTeamId !== match.awayTeamId
  ) {
    throw new Error("That team isn't part of this match.");
  }
  if (respondingTeamId === match.proposedByTeamId) {
    throw new Error("You already made the latest proposal — it's their turn.");
  }
  await db
    .update(matches)
    .set({
      scheduledAt,
      location,
      proposedByTeamId: respondingTeamId,
      updatedAt: new Date(),
    })
    .where(eq(matches.id, matchId));
}

export async function cancelMatch(matchId: string) {
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) throw new Error("Match not found.");
  if (!CANCELLABLE.includes(match.status as (typeof CANCELLABLE)[number])) {
    throw new Error("This match can no longer be cancelled.");
  }
  await db
    .update(matches)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(matches.id, matchId));
}

// ---------- Phase 5: scores ----------

export type GameInput = { homeScore: number; awayScore: number };

const AUTO_CONFIRM_MS = 72 * 60 * 60 * 1000;

function validateGames(games: GameInput[]) {
  if (!Array.isArray(games) || games.length === 0) {
    throw new Error("Enter the score for at least one game.");
  }
  if (games.length > 7) {
    throw new Error("A match can have at most 7 games.");
  }
  games.forEach((g, i) => {
    const ok =
      Number.isInteger(g.homeScore) &&
      Number.isInteger(g.awayScore) &&
      g.homeScore >= 0 &&
      g.awayScore >= 0 &&
      g.homeScore <= 99 &&
      g.awayScore <= 99;
    if (!ok) throw new Error(`Game ${i + 1} has an invalid score.`);
    if (g.homeScore === g.awayScore) {
      throw new Error(`Game ${i + 1} can't end in a tie — every game needs a winner.`);
    }
  });
}

async function replaceGames(matchId: string, games: GameInput[]) {
  await db.delete(matchGames).where(eq(matchGames.matchId, matchId));
  await db.insert(matchGames).values(
    games.map((g, i) => ({
      matchId,
      gameNumber: i + 1,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
    })),
  );
}

export async function enterScore(
  matchId: string,
  enteringTeamId: string,
  games: GameInput[],
  userId: string,
) {
  validateGames(games);
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) throw new Error("Match not found.");
  if (
    enteringTeamId !== match.homeTeamId &&
    enteringTeamId !== match.awayTeamId
  ) {
    throw new Error("That team isn't part of this match.");
  }
  if (!["scheduled", "completed", "disputed"].includes(match.status)) {
    throw new Error(
      match.status === "confirmed"
        ? "This score is already confirmed — an admin can still edit it."
        : "You can only record a score once a match is scheduled.",
    );
  }
  await replaceGames(matchId, games);
  await db
    .update(matches)
    .set({
      status: "completed",
      scoreEnteredBy: userId,
      scoreEnteredByTeamId: enteringTeamId,
      scoreEnteredAt: new Date(),
      scoreConfirmedBy: null,
      scoreConfirmedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(matches.id, matchId));
}

export async function confirmScore(matchId: string, userId: string) {
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) throw new Error("Match not found.");
  if (match.status !== "completed") {
    throw new Error("There's no score awaiting confirmation.");
  }
  await db
    .update(matches)
    .set({
      status: "confirmed",
      scoreConfirmedBy: userId,
      scoreConfirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(matches.id, matchId));
}

export async function disputeScore(matchId: string) {
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) throw new Error("Match not found.");
  if (match.status !== "completed") {
    throw new Error("There's no score awaiting confirmation to dispute.");
  }
  await db
    .update(matches)
    .set({ status: "disputed", updatedAt: new Date() })
    .where(eq(matches.id, matchId));
}

/** Admin override: set the final score and confirm, regardless of current state. */
export async function resolveScore(
  matchId: string,
  games: GameInput[],
  userId: string,
) {
  validateGames(games);
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) throw new Error("Match not found.");
  await replaceGames(matchId, games);
  await db
    .update(matches)
    .set({
      status: "confirmed",
      scoreConfirmedBy: userId,
      scoreConfirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(matches.id, matchId));
}

/** Confirms any score that has sat unconfirmed for 72h. Idempotent. */
export async function autoConfirmStaleScores() {
  const cutoff = new Date(Date.now() - AUTO_CONFIRM_MS);
  const updated = await db
    .update(matches)
    .set({ status: "confirmed", scoreConfirmedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(matches.status, "completed"), lt(matches.scoreEnteredAt, cutoff)))
    .returning({ id: matches.id });
  return updated.length;
}
