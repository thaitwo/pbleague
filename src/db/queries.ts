import { type SQL, and, asc, desc, eq, inArray, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./index";
import {
  leagues,
  matchGames,
  matches,
  teamMemberships,
  teams,
  user,
} from "./schema";

export type TeamMember = {
  membershipId: string;
  userId: string | null;
  role: "captain" | "co_captain" | "player";
  status: "pending" | "active" | "removed";
  name: string | null;
  email: string;
  claimed: boolean;
  requestedAt: Date;
};

/** Loads all non-removed memberships for the given teams, grouped by team id. */
async function loadMembersByTeam(teamIds: string[]) {
  const byTeam = new Map<string, TeamMember[]>();
  if (teamIds.length === 0) return byTeam;

  const rows = await db
    .select({
      membershipId: teamMemberships.id,
      teamId: teamMemberships.teamId,
      userId: teamMemberships.userId,
      role: teamMemberships.role,
      status: teamMemberships.status,
      invitedEmail: teamMemberships.invitedEmail,
      createdAt: teamMemberships.createdAt,
      userName: user.name,
      userEmail: user.email,
    })
    .from(teamMemberships)
    .leftJoin(user, eq(teamMemberships.userId, user.id))
    .where(
      and(
        inArray(teamMemberships.teamId, teamIds),
        ne(teamMemberships.status, "removed"),
      ),
    );

  for (const row of rows) {
    const member: TeamMember = {
      membershipId: row.membershipId,
      userId: row.userId,
      role: row.role,
      status: row.status,
      name: row.userName ?? null,
      email: row.userEmail ?? row.invitedEmail ?? "",
      claimed: row.userId !== null,
      requestedAt: row.createdAt,
    };
    const list = byTeam.get(row.teamId) ?? [];
    list.push(member);
    byTeam.set(row.teamId, list);
  }
  return byTeam;
}

export async function listLeagues() {
  return db.select().from(leagues).orderBy(desc(leagues.createdAt));
}

export type TeamWithMembers = {
  id: string;
  name: string;
  rosterCap: number | null;
  members: TeamMember[]; // active members only
  captain: TeamMember | null;
};

export type LeagueDetail = {
  league: typeof leagues.$inferSelect;
  teams: TeamWithMembers[];
};

export async function getLeagueDetail(
  leagueId: string,
): Promise<LeagueDetail | null> {
  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) return null;

  const teamRows = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, leagueId))
    .orderBy(asc(teams.name));

  const byTeam = await loadMembersByTeam(teamRows.map((t) => t.id));

  const teamsWithMembers: TeamWithMembers[] = teamRows.map((t) => {
    const active = (byTeam.get(t.id) ?? []).filter((m) => m.status === "active");
    return {
      id: t.id,
      name: t.name,
      rosterCap: t.rosterCap,
      members: active,
      captain: active.find((m) => m.role === "captain") ?? null,
    };
  });

  return { league, teams: teamsWithMembers };
}

/** Public directory: non-draft leagues with their teams and rosters. */
export type DirectoryLeague = {
  league: typeof leagues.$inferSelect;
  teams: TeamWithMembers[];
};

export async function listPublicLeagues(): Promise<DirectoryLeague[]> {
  const leagueRows = await db
    .select()
    .from(leagues)
    .where(ne(leagues.status, "draft"))
    .orderBy(desc(leagues.createdAt));
  if (leagueRows.length === 0) return [];

  const teamRows = await db
    .select()
    .from(teams)
    .where(
      inArray(
        teams.leagueId,
        leagueRows.map((l) => l.id),
      ),
    )
    .orderBy(asc(teams.name));

  const byTeam = await loadMembersByTeam(teamRows.map((t) => t.id));

  return leagueRows.map((league) => ({
    league,
    teams: teamRows
      .filter((t) => t.leagueId === league.id)
      .map((t) => {
        const active = (byTeam.get(t.id) ?? []).filter(
          (m) => m.status === "active",
        );
        return {
          id: t.id,
          name: t.name,
          rosterCap: t.rosterCap,
          members: active,
          captain: active.find((m) => m.role === "captain") ?? null,
        };
      }),
  }));
}

export type TeamPage = {
  team: typeof teams.$inferSelect;
  league: typeof leagues.$inferSelect;
  members: TeamMember[]; // active
  pendingRequests: TeamMember[]; // status = pending, has userId
};

export async function getTeamPage(teamId: string): Promise<TeamPage | null> {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!team) return null;

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, team.leagueId))
    .limit(1);

  const all = (await loadMembersByTeam([teamId])).get(teamId) ?? [];
  return {
    team,
    league,
    members: all.filter((m) => m.status === "active"),
    pendingRequests: all.filter((m) => m.status === "pending" && m.userId),
  };
}

export type UserTeam = {
  teamId: string;
  teamName: string;
  leagueName: string;
  leagueLevel: string;
  role: "captain" | "co_captain" | "player";
  status: "pending" | "active" | "removed";
};

export async function getUserTeams(userId: string): Promise<UserTeam[]> {
  return db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      leagueName: leagues.name,
      leagueLevel: leagues.skillLevel,
      role: teamMemberships.role,
      status: teamMemberships.status,
    })
    .from(teamMemberships)
    .innerJoin(teams, eq(teamMemberships.teamId, teams.id))
    .innerJoin(leagues, eq(teams.leagueId, leagues.id))
    .where(
      and(
        eq(teamMemberships.userId, userId),
        ne(teamMemberships.status, "removed"),
      ),
    )
    .orderBy(asc(leagues.name), asc(teams.name));
}

export async function getTeamByInviteToken(token: string) {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.inviteToken, token))
    .limit(1);
  if (!team) return null;
  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, team.leagueId))
    .limit(1);
  return { team, league };
}

// ---------- Phase 4: scheduling ----------

export type MatchStatus =
  | "proposed"
  | "scheduled"
  | "completed"
  | "confirmed"
  | "disputed"
  | "cancelled";

export type MatchGame = {
  gameNumber: number;
  homeScore: number;
  awayScore: number;
};

export type MatchView = {
  id: string;
  leagueId: string;
  status: MatchStatus;
  scheduledAt: Date | null;
  location: string | null;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  proposedByTeamId: string | null;
  scoreEnteredByTeamId: string | null;
  scoreEnteredAt: Date | null;
  games: MatchGame[];
};

const homeTeam = alias(teams, "home_team");
const awayTeam = alias(teams, "away_team");

async function gamesByMatch(matchIds: string[]) {
  const byMatch = new Map<string, MatchGame[]>();
  if (matchIds.length === 0) return byMatch;
  const rows = await db
    .select()
    .from(matchGames)
    .where(inArray(matchGames.matchId, matchIds))
    .orderBy(asc(matchGames.gameNumber));
  for (const row of rows) {
    const list = byMatch.get(row.matchId) ?? [];
    list.push({
      gameNumber: row.gameNumber,
      homeScore: row.homeScore,
      awayScore: row.awayScore,
    });
    byMatch.set(row.matchId, list);
  }
  return byMatch;
}

async function selectMatches(where: SQL | undefined): Promise<MatchView[]> {
  const rows = await db
    .select({
      id: matches.id,
      leagueId: matches.leagueId,
      status: matches.status,
      scheduledAt: matches.scheduledAt,
      location: matches.location,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeTeamName: homeTeam.name,
      awayTeamName: awayTeam.name,
      proposedByTeamId: matches.proposedByTeamId,
      scoreEnteredByTeamId: matches.scoreEnteredByTeamId,
      scoreEnteredAt: matches.scoreEnteredAt,
    })
    .from(matches)
    .innerJoin(homeTeam, eq(matches.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(matches.awayTeamId, awayTeam.id))
    .where(where)
    .orderBy(asc(matches.scheduledAt));

  const games = await gamesByMatch(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, games: games.get(r.id) ?? [] }));
}

/** Other teams in the same league — candidate opponents. */
export async function listLeagueTeamsExcept(
  leagueId: string,
  excludeTeamId: string,
) {
  return db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(and(eq(teams.leagueId, leagueId), ne(teams.id, excludeTeamId)))
    .orderBy(asc(teams.name));
}

/** Non-cancelled matches involving a team. */
export async function getTeamMatches(teamId: string): Promise<MatchView[]> {
  return selectMatches(
    and(
      or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)),
      ne(matches.status, "cancelled"),
    ),
  );
}

/** Matches across all of a user's teams, plus the ids of those teams. */
export async function getUserMatches(userId: string) {
  const memberships = await db
    .select({ teamId: teamMemberships.teamId })
    .from(teamMemberships)
    .where(
      and(
        eq(teamMemberships.userId, userId),
        ne(teamMemberships.status, "removed"),
      ),
    );
  const myTeamIds = [...new Set(memberships.map((m) => m.teamId))];
  if (myTeamIds.length === 0) return { matches: [] as MatchView[], myTeamIds };

  const rows = await selectMatches(
    and(
      or(
        inArray(matches.homeTeamId, myTeamIds),
        inArray(matches.awayTeamId, myTeamIds),
      ),
      ne(matches.status, "cancelled"),
    ),
  );
  return { matches: rows, myTeamIds };
}

export async function getMatch(matchId: string) {
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  return match ?? null;
}

/** Disputed matches across all leagues — for the admin console. */
export async function getDisputedMatches(): Promise<MatchView[]> {
  return selectMatches(eq(matches.status, "disputed"));
}

// ---------- Phase 5: standings ----------

export type StandingRow = {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  gamesWon: number;
  gamesLost: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  gameWinPct: number;
  streak: string;
};

function streakLabel(results: boolean[]): string {
  if (results.length === 0) return "—";
  const last = results[results.length - 1];
  let n = 0;
  for (let i = results.length - 1; i >= 0 && results[i] === last; i--) n++;
  return `${last ? "W" : "L"}${n}`;
}

export async function getLeagueStandings(
  leagueId: string,
): Promise<StandingRow[]> {
  const teamRows = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.leagueId, leagueId))
    .orderBy(asc(teams.name));

  // Confirmed matches, chronological (selectMatches orders by scheduledAt asc).
  const confirmed = await selectMatches(
    and(eq(matches.leagueId, leagueId), eq(matches.status, "confirmed")),
  );

  const acc = new Map<string, StandingRow>();
  const chron = new Map<string, boolean[]>();
  for (const t of teamRows) {
    acc.set(t.id, {
      teamId: t.id,
      teamName: t.name,
      played: 0,
      wins: 0,
      losses: 0,
      gamesWon: 0,
      gamesLost: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
      gameWinPct: 0,
      streak: "—",
    });
    chron.set(t.id, []);
  }

  // head-to-head: winner -> loser -> count
  const h2h = new Map<string, Map<string, number>>();
  const addH2h = (w: string, l: string) => {
    const inner = h2h.get(w) ?? new Map<string, number>();
    inner.set(l, (inner.get(l) ?? 0) + 1);
    h2h.set(w, inner);
  };

  for (const m of confirmed) {
    const home = acc.get(m.homeTeamId);
    const away = acc.get(m.awayTeamId);
    if (!home || !away) continue;

    let hg = 0;
    let ag = 0;
    let hp = 0;
    let ap = 0;
    for (const g of m.games) {
      hp += g.homeScore;
      ap += g.awayScore;
      if (g.homeScore > g.awayScore) hg++;
      else if (g.awayScore > g.homeScore) ag++;
    }

    home.played++;
    away.played++;
    home.gamesWon += hg;
    home.gamesLost += ag;
    away.gamesWon += ag;
    away.gamesLost += hg;
    home.pointsFor += hp;
    home.pointsAgainst += ap;
    away.pointsFor += ap;
    away.pointsAgainst += hp;

    if (hg > ag) {
      home.wins++;
      away.losses++;
      addH2h(m.homeTeamId, m.awayTeamId);
      chron.get(m.homeTeamId)!.push(true);
      chron.get(m.awayTeamId)!.push(false);
    } else if (ag > hg) {
      away.wins++;
      home.losses++;
      addH2h(m.awayTeamId, m.homeTeamId);
      chron.get(m.awayTeamId)!.push(true);
      chron.get(m.homeTeamId)!.push(false);
    }
    // equal game wins → treated as no result (shouldn't happen in a decided match)
  }

  const rows = [...acc.values()];
  for (const r of rows) {
    r.pointDiff = r.pointsFor - r.pointsAgainst;
    const totalGames = r.gamesWon + r.gamesLost;
    r.gameWinPct = totalGames > 0 ? r.gamesWon / totalGames : 0;
    r.streak = streakLabel(chron.get(r.teamId)!);
  }

  rows.sort((a, b) => {
    if (a.wins !== b.wins) return b.wins - a.wins;
    // head-to-head between the two tied teams
    const ab = h2h.get(a.teamId)?.get(b.teamId) ?? 0;
    const ba = h2h.get(b.teamId)?.get(a.teamId) ?? 0;
    if (ab !== ba) return ba - ab;
    if (a.gameWinPct !== b.gameWinPct) return b.gameWinPct - a.gameWinPct;
    if (a.pointDiff !== b.pointDiff) return b.pointDiff - a.pointDiff;
    return a.teamName.localeCompare(b.teamName);
  });

  return rows;
}

export async function getLeaguePublic(leagueId: string) {
  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) return null;

  const standings = await getLeagueStandings(leagueId);
  const recent = (
    await selectMatches(
      and(eq(matches.leagueId, leagueId), eq(matches.status, "confirmed")),
    )
  )
    .sort(
      (a, b) => (b.scheduledAt?.getTime() ?? 0) - (a.scheduledAt?.getTime() ?? 0),
    )
    .slice(0, 8);
  const upcoming = await selectMatches(
    and(eq(matches.leagueId, leagueId), eq(matches.status, "scheduled")),
  );

  return { league, standings, recent, upcoming };
}
