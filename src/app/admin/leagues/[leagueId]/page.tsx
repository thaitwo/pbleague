import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateTeamDialog } from "@/components/admin/create-team-dialog";
import { TeamRowActions } from "@/components/admin/team-row-actions";
import { EditLeagueDialog } from "@/components/admin/edit-league-dialog";
import { PageHeader } from "@/components/page-header";
import { deleteTeamAction } from "@/app/admin/actions";
import { getLeagueDetail } from "@/db/queries";

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
    </>
  );
}
