import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateTeamDialog } from "@/components/admin/create-team-dialog";
import { TeamRowActions } from "@/components/admin/team-row-actions";
import { EditLeagueDialog } from "@/components/admin/edit-league-dialog";
import { ScheduleControls } from "@/components/admin/schedule-controls";
import { PageHeader } from "@/components/page-header";
import { deleteTeamAction } from "@/app/admin/actions";
import { getLeagueDetail, getLeagueMatches, type MatchStatus } from "@/db/queries";
import { formatDateTime } from "@/lib/format";

const FIXTURE_STATUS_LABEL: Record<MatchStatus, string> = {
  unscheduled: "Not scheduled",
  proposed: "Proposed",
  scheduled: "Scheduled",
  completed: "Awaiting confirmation",
  confirmed: "Final",
  disputed: "Disputed",
  cancelled: "Cancelled",
};

function toDateInput(d: Date | null) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const detail = await getLeagueDetail(leagueId);
  if (!detail) notFound();

  const { league, teams } = detail;
  const fixtures = await getLeagueMatches(league.id);

  return (
    <>
      <PageHeader
        title={league.name}
        backHref="/admin"
        action={
          <div className="flex items-center gap-2">
            <EditLeagueDialog
              leagueId={league.id}
              leagueName={league.name}
              initial={{
                name: league.name,
                skillLevel: league.skillLevel,
                status: league.status,
                seasonStart: toDateInput(league.seasonStart),
                seasonEnd: toDateInput(league.seasonEnd),
              }}
            />
            <CreateTeamDialog leagueId={league.id} />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Teams</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams yet.</p>
          ) : (
            <div className="flex flex-col divide-y">
              <div className="-mx-2 grid grid-cols-[1.5fr_1fr_1.5fr_1.75rem] items-center gap-4 px-2 pb-2 text-xs font-medium text-muted-foreground">
                <span>Team Name</span>
                <span>Area</span>
                <span>Captain</span>
                <span className="sr-only">Actions</span>
              </div>
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="relative -mx-2 grid grid-cols-[1.5fr_1fr_1.5fr_1.75rem] items-center gap-4 px-2 py-3 transition-colors hover:bg-muted/50"
                >
                  <Link
                    href={`/teams/${team.id}?from=admin`}
                    className="min-w-0 truncate font-medium after:absolute after:inset-0"
                  >
                    {team.name}
                  </Link>
                  <span className="min-w-0 truncate text-sm text-muted-foreground">
                    {team.area ?? "No area"}
                  </span>
                  <span className="min-w-0 truncate text-sm text-muted-foreground">
                    {team.captain
                      ? `${team.captain.name ?? team.captain.email}${
                          team.captain.claimed ? "" : " (pending)"
                        }`
                      : "No captain"}
                  </span>
                  <div className="relative z-10">
                    <TeamRowActions
                      leagueId={league.id}
                      team={{
                        id: team.id,
                        name: team.name,
                        area: team.area,
                        rosterCap: team.rosterCap,
                        hasCaptain: team.captain !== null,
                      }}
                      deleteAction={deleteTeamAction.bind(
                        null,
                        league.id,
                        team.id,
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule</CardTitle>
          <CardAction>
            <ScheduleControls
              leagueId={league.id}
              hasFixtures={fixtures.length > 0}
              canGenerate={teams.length >= 2}
            />
          </CardAction>
        </CardHeader>
        <CardContent>
          {fixtures.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {teams.length < 2
                ? "Add at least two teams, then generate a season schedule."
                : "No schedule yet — generate one to create every matchup. Home captains then set the date & time for their home matches."}
            </p>
          ) : (
            <div className="flex flex-col divide-y">
              <div className="-mx-2 grid grid-cols-[1.5fr_1.5fr_1fr_1.25fr] items-center gap-4 px-2 pb-2 text-xs font-medium text-muted-foreground">
                <span>Home</span>
                <span>Away</span>
                <span>Status</span>
                <span>Date &amp; time</span>
              </div>
              {fixtures.map((m) => (
                <div
                  key={m.id}
                  className="-mx-2 grid grid-cols-[1.5fr_1.5fr_1fr_1.25fr] items-center gap-4 px-2 py-3"
                >
                  <span className="min-w-0 truncate font-medium">
                    {m.homeTeamName}
                  </span>
                  <span className="min-w-0 truncate text-sm text-muted-foreground">
                    {m.awayTeamName}
                  </span>
                  <Badge
                    variant={m.status === "unscheduled" ? "outline" : "secondary"}
                    className="justify-self-start"
                  >
                    {FIXTURE_STATUS_LABEL[m.status]}
                  </Badge>
                  <span className="min-w-0 truncate text-sm text-muted-foreground">
                    {m.scheduledAt ? formatDateTime(m.scheduledAt) : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
