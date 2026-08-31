import {
  type SQL,
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { divisionDisplayName } from "@/lib/constants";
import { db } from "./index";
import {
  divisions,
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

// ---------- Leagues (seasons) ----------

/** All leagues (season/program buckets), newest first. */
export async function listLeagues() {
  return db.select().from(leagues).orderBy(desc(leagues.createdAt));
}

export type DivisionSummary = {
  id: string;
  name: string | null;
  rating: string;
  ratingType: "single" | "combo";
  gender: "mens" | "womens" | "mixed";
  ageGroup: string;
  status: "draft" | "active" | "completed";
  seasonStart: Date | null;
  seasonEnd: Date | null;
  teamCount: number;
};

async function loadDivisionSummaries(
  where: SQL | undefined,
): Promise<DivisionSummary[]> {
  const divRows = await db
    .select()
    .from(divisions)
    .where(where)
    .orderBy(asc(divisions.rating), asc(divisions.gender));

  const counts = new Map<string, number>();
  if (divRows.length > 0) {
    const rows = await db
      .select({ divisionId: teams.divisionId, n: count() })
      .from(teams)
      .where(
        inArray(
          teams.divisionId,
          divRows.map((d) => d.id),
        ),
      )
      .groupBy(teams.divisionId);
    for (const r of rows) counts.set(r.divisionId, Number(r.n));
  }

  return divRows
    .map((d) => ({
      id: d.id,
      name: d.name,
      rating: d.rating,
      ratingType: d.ratingType,
      gender: d.gender,
      ageGroup: d.ageGroup,
      status: d.status,
      seasonStart: d.seasonStart,
      seasonEnd: d.seasonEnd,
      teamCount: counts.get(d.id) ?? 0,
    }))
    .sort((a, b) =>
      divisionDisplayName(a).localeCompare(divisionDisplayName(b), undefined, {
        sensitivity: "base",
        numeric: true,
      }),
    );
}

export type LeagueDetail = {
  league: typeof leagues.$inferSelect;
  divisions: DivisionSummary[];
};

/** A league (season) with its divisions — for the admin league page. */
export async function getLeagueDetail(
  leagueId: string,
): Promise<LeagueDetail | null> {
  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) return null;

  const divisionList = await loadDivisionSummaries(
    eq(divisions.leagueId, leagueId),
  );
  return { league, divisions: divisionList };
}

/** Public directory: non-draft leagues (seasons), most recent season first. */
export async function listPublicLeagues() {
  return db
    .select()
    .from(leagues)
    .where(ne(leagues.status, "draft"))
    .orderBy(
      sql`${leagues.seasonStart} desc nulls last`,
      desc(leagues.createdAt),
    );
}

/** A league (season) with its non-draft divisions — the public divisions directory. */
export async function getLeaguePublic(leagueId: string) {
  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) return null;
  const divisionList = await loadDivisionSummaries(
    and(eq(divisions.leagueId, leagueId), ne(divisions.status, "draft")),
  );
  return { league, divisions: divisionList };
}

// ---------- Divisions (rating flights) ----------

export type TeamWithMembers = {
  id: string;
  name: string;
  area: string | null;
  rosterCap: number | null;
  members: TeamMember[]; // active members only
  captain: TeamMember | null;
};

export type DivisionDetail = {
  division: typeof divisions.$inferSelect;
  league: typeof leagues.$inferSelect;
  teams: TeamWithMembers[];
};

/** A division with its teams + parent league — for the admin division page. */
export async function getDivisionDetail(
  divisionId: string,
): Promise<DivisionDetail | null> {
  const [division] = await db
    .select()
    .from(divisions)
    .where(eq(divisions.id, divisionId))
    .limit(1);
  if (!division) return null;

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, division.leagueId))
    .limit(1);

  const teamRows = await db
    .select()
    .from(teams)
    .where(eq(teams.divisionId, divisionId))
    .orderBy(asc(teams.name));

  const byTeam = await loadMembersByTeam(teamRows.map((t) => t.id));

  const teamsWithMembers: TeamWithMembers[] = teamRows.map((t) => {
    const active = (byTeam.get(t.id) ?? []).filter((m) => m.status === "active");
    return {
      id: t.id,
      name: t.name,
      area: t.area,
      rosterCap: t.rosterCap,
      members: active,
      captain: active.find((m) => m.role === "captain") ?? null,
    };
  });

  return { division, league, teams: teamsWithMembers };
}

// ---------- Teams ----------

export type TeamPage = {
  team: typeof teams.$inferSelect;
  division: typeof divisions.$inferSelect;
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

  const [division] = await db
    .select()
    .from(divisions)
    .where(eq(divisions.id, team.divisionId))
    .limit(1);
  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, division.leagueId))
    .limit(1);

  const all = (await loadMembersByTeam([teamId])).get(teamId) ?? [];
  return {
    team,
    division,
    league,
    members: all.filter((m) => m.status === "active"),
    pendingRequests: all.filter((m) => m.status === "pending" && m.userId),
  };
}

export type UserTeam = {
  teamId: string;
  teamName: string;
  divisionId: string;
  divisionName: string | null;
  divisionRating: string;
  divisionGender: "mens" | "womens" | "mixed";
  divisionAgeGroup: string;
  leagueName: string;
  role: "captain" | "co_captain" | "player";
  status: "pending" | "active" | "removed";
};

export async function getUserTeams(userId: string): Promise<UserTeam[]> {
  return db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      divisionId: divisions.id,
      divisionName: divisions.name,
      divisionRating: divisions.rating,
      divisionGender: divisions.gender,
      divisionAgeGroup: divisions.ageGroup,
      leagueName: leagues.name,
      role: teamMemberships.role,
      status: teamMemberships.status,
    })
    .from(teamMemberships)
    .innerJoin(teams, eq(teamMemberships.teamId, teams.id))
    .innerJoin(divisions, eq(teams.divisionId, divisions.id))
    .innerJoin(leagues, eq(divisions.leagueId, leagues.id))
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
  const [division] = await db
    .select()
    .from(divisions)
    .where(eq(divisions.id, team.divisionId))
    .limit(1);
  return { team, division };
}

// ---------- Scheduling ----------

export type MatchStatus =
  | "unscheduled"
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
  divisionId: string;
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
      divisionId: matches.divisionId,
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

/** Other teams in the same division — candidate opponents. */
export async function listDivisionTeamsExcept(
  divisionId: string,
  excludeTeamId: string,
) {
  return db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(and(eq(teams.divisionId, divisionId), ne(teams.id, excludeTeamId)))
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

/** Disputed matches across all divisions — for the admin console. */
export async function getDisputedMatches(): Promise<MatchView[]> {
  return selectMatches(eq(matches.status, "disputed"));
}

/** All non-cancelled fixtures in a division — for the admin schedule view. */
export async function getDivisionMatches(
  divisionId: string,
): Promise<MatchView[]> {
  return selectMatches(
    and(eq(matches.divisionId, divisionId), ne(matches.status, "cancelled")),
  );
}

/** True once a division has any non-cancelled fixture (i.e. a schedule exists). */
export async function divisionHasSchedule(
  divisionId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ n: count() })
    .from(matches)
    .where(
      and(
        eq(matches.divisionId, divisionId),
        ne(matches.status, "cancelled"),
      ),
    )
    .limit(1);
  return Number(row?.n ?? 0) > 0;
}

// ---------- Standings ----------

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

export async function getDivisionStandings(
  divisionId: string,
): Promise<StandingRow[]> {
  const teamRows = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.divisionId, divisionId))
    .orderBy(asc(teams.name));

  // Confirmed matches, chronological (selectMatches orders by scheduledAt asc).
  const confirmed = await selectMatches(
    and(eq(matches.divisionId, divisionId), eq(matches.status, "confirmed")),
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

/** A division's standings + recent/upcoming matches + parent league — public page. */
export async function getDivisionPublic(divisionId: string) {
  const [division] = await db
    .select()
    .from(divisions)
    .where(eq(divisions.id, divisionId))
    .limit(1);
  if (!division) return null;
  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, division.leagueId))
    .limit(1);

  const standings = await getDivisionStandings(divisionId);
  const recent = (
    await selectMatches(
      and(
        eq(matches.divisionId, divisionId),
        eq(matches.status, "confirmed"),
      ),
    )
  )
    .sort(
      (a, b) => (b.scheduledAt?.getTime() ?? 0) - (a.scheduledAt?.getTime() ?? 0),
    )
    .slice(0, 8);
  const upcoming = await selectMatches(
    and(eq(matches.divisionId, divisionId), eq(matches.status, "scheduled")),
  );

  return { division, league, standings, recent, upcoming };
}
