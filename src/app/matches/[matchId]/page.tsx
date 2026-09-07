import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import {
  getMatchDetail,
  matchOutcome,
  type MatchLineupView,
  type MatchStatus,
} from "@/db/queries";
import { divisionDisplayName } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

const STATUS_LABEL: Record<MatchStatus, string> = {
  unscheduled: "Not scheduled",
  proposed: "Proposed",
  scheduled: "Scheduled",
  completed: "Awaiting confirmation",
  confirmed: "Final",
  disputed: "Disputed",
  cancelled: "Cancelled",
};

const STATUS_VARIANT: Record<
  MatchStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  unscheduled: "outline",
  proposed: "outline",
  scheduled: "default",
  completed: "secondary",
  confirmed: "secondary",
  disputed: "destructive",
  cancelled: "outline",
};

function lineupGamesWon(lu: MatchLineupView) {
  let home = 0;
  let away = 0;
  for (const g of lu.games) {
    if (g.homeScore > g.awayScore) home++;
    else if (g.awayScore > g.homeScore) away++;
  }
  return { home, away };
}

function players(list: { name: string | null }[]) {
  if (list.length === 0) return "—";
  return list.map((p) => p.name ?? "—").join(" / ");
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const data = await getMatchDetail(matchId);
  if (!data) notFound();

  const { match, division } = data;
  const o = matchOutcome(match);
  const hasScores = match.lineups.some((lu) => lu.games.length > 0);
  const homeWon = o.homeLineups > o.awayLineups;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${match.homeTeamName} vs ${match.awayTeamName}`}
        titleExtra={
          <Badge variant={STATUS_VARIANT[match.status]}>
            {STATUS_LABEL[match.status]}
          </Badge>
        }
        description={division ? divisionDisplayName(division) : undefined}
        backHref={`/divisions/${match.divisionId}`}
      />

      <Card>
        <CardContent className="flex flex-col gap-2 py-4 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">When</span>
            <span>{formatDateTime(match.scheduledAt)}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Location</span>
            <span>{match.location ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Lineups won</span>
            <span className="font-medium">
              {match.homeTeamName} {o.homeLineups}–{o.awayLineups}{" "}
              {match.awayTeamName}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lineups</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasScores ? (
            <p className="text-sm text-muted-foreground">
              No scores recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lineup</TableHead>
                  <TableHead>{match.homeTeamName}</TableHead>
                  <TableHead>{match.awayTeamName}</TableHead>
                  <TableHead className="text-right">Winners Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {match.lineups.map((lu) => {
                  const gw = lineupGamesWon(lu);
                  const homeTook = gw.home > gw.away;
                  const awayTook = gw.away > gw.home;
                  // Winner-first so it matches the "Winners Score" column.
                  const scoreLine = lu.games
                    .map((g) =>
                      homeTook
                        ? `${g.homeScore}–${g.awayScore}`
                        : `${g.awayScore}–${g.homeScore}`,
                    )
                    .join(", ");
                  return (
                    <TableRow key={lu.id}>
                      <TableCell className="text-muted-foreground">
                        Lineup {lu.position}
                      </TableCell>
                      <TableCell
                        className={
                          homeTook
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {players(lu.homePlayers)}
                        {homeTook && (
                          <Badge variant="outline" className="ml-2">
                            Won
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell
                        className={
                          awayTook
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {players(lu.awayPlayers)}
                        {awayTook && (
                          <Badge variant="outline" className="ml-2">
                            Won
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {scoreLine || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {match.status === "confirmed" && (
        <p className="text-sm text-muted-foreground">
          Final result: {homeWon ? match.homeTeamName : match.awayTeamName} won{" "}
          {Math.max(o.homeLineups, o.awayLineups)}–
          {Math.min(o.homeLineups, o.awayLineups)}.
        </p>
      )}
    </div>
  );
}
