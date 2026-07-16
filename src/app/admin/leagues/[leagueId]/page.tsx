import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateTeamDialog } from "@/components/admin/create-team-dialog";
import { EditTeamDialog } from "@/components/admin/edit-team-dialog";
import { DeleteButton } from "@/components/admin/delete-button";
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
          <CardDescription>
            Click a team to view its roster and matches.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams yet.</p>
          ) : (
            <div className="flex flex-col divide-y">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/teams/${team.id}?from=admin`}
                      className="font-medium hover:underline"
                    >
                      {team.name}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {team.area ?? "No area"}
                      {" · "}
                      {team.captain
                        ? `Captain ${team.captain.name ?? team.captain.email}${
                            team.captain.claimed ? "" : " (pending)"
                          }`
                        : "No captain"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <EditTeamDialog
                      leagueId={league.id}
                      team={{
                        id: team.id,
                        name: team.name,
                        area: team.area,
                        rosterCap: team.rosterCap,
                        hasCaptain: team.captain !== null,
                      }}
                    />
                    <DeleteButton
                      action={deleteTeamAction.bind(null, league.id, team.id)}
                      confirmMessage={`Delete team "${team.name}"?`}
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
