import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { autoConfirmStaleScores } from "@/db/mutations";
import { getLeaguePublic, type MatchView } from "@/db/queries";
import { formatDateTime } from "@/lib/format";

function fmtDiff(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

function fmtDate(d: Date | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function seasonLabel(start: Date | null, end: Date | null) {
  const s = fmtDate(start);
  const e = fmtDate(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return `Starts ${s}`;
  if (e) return `Ends ${e}`;
  return undefined;
}

function resultLine(m: MatchView) {
  const homeGames = m.games.filter((g) => g.homeScore > g.awayScore).length;
  const awayGames = m.games.filter((g) => g.awayScore > g.homeScore).length;
  const homeWon = homeGames > awayGames;
  const winner = homeWon ? m.homeTeamName : m.awayTeamName;
  const loser = homeWon ? m.awayTeamName : m.homeTeamName;
  const line = m.games
    .map((g) =>
      homeWon
        ? `${g.homeScore}–${g.awayScore}`
        : `${g.awayScore}–${g.homeScore}`,
    )
    .join(", ");
  return `${winner} def. ${loser} (${line})`;
}

export default async function LeagueStandingsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  await autoConfirmStaleScores();
  const data = await getLeaguePublic(leagueId);
  if (!data) notFound();

  const { league, standings, recent, upcoming } = data;
  const anyPlayed = standings.some((r) => r.played > 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={league.name}
        description={seasonLabel(league.seasonStart, league.seasonEnd)}
        backHref="/leagues"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Standings — left column */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Standings</CardTitle>
              <CardDescription>
                {anyPlayed
                  ? "Ranked by wins, then head-to-head, game win %, and point differential."
                  : "No matches have been played yet."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {standings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No teams in this league yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-2 font-medium">#</th>
                        <th className="py-2 pr-2 font-medium">Team</th>
                        <th className="py-2 pr-2 text-right font-medium">W</th>
                        <th className="py-2 pr-2 text-right font-medium">L</th>
                        <th className="py-2 pr-2 text-right font-medium">
                          Games
                        </th>
                        <th className="py-2 pr-2 text-right font-medium">
                          Diff
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((r, i) => (
                        <tr key={r.teamId} className="border-b last:border-0">
                          <td className="py-2 pr-2 text-muted-foreground">
                            {i + 1}
                          </td>
                          <td className="py-2 pr-2">
                            <Link
                              href={`/teams/${r.teamId}`}
                              className="font-medium hover:underline"
                            >
                              {r.teamName}
                            </Link>
                          </td>
                          <td className="py-2 pr-2 text-right">{r.wins}</td>
                          <td className="py-2 pr-2 text-right">{r.losses}</td>
                          <td className="py-2 pr-2 text-right text-muted-foreground">
                            {r.gamesWon}–{r.gamesLost}
                          </td>
                          <td className="py-2 pr-2 text-right text-muted-foreground">
                            {fmtDiff(r.pointDiff)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent + Upcoming — right column */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent results</CardTitle>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">No results yet.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {recent.map((m) => (
                    <li key={m.id} className="border-b pb-2 last:border-0">
                      <div>{resultLine(m)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(m.scheduledAt)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing scheduled yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {upcoming.map((m) => (
                    <li key={m.id} className="border-b pb-2 last:border-0">
                      <div>
                        {m.homeTeamName} vs {m.awayTeamName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(m.scheduledAt)}
                        {m.location ? ` · ${m.location}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
