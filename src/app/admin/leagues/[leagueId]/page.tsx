import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddPlayerForm } from "@/components/admin/add-player-form";
import { AssignCaptainForm } from "@/components/admin/assign-captain-form";
import { CreateTeamForm } from "@/components/admin/create-team-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { EditLeagueForm } from "@/components/admin/edit-league-form";
import { PageHeader } from "@/components/page-header";
import {
  deleteLeagueAction,
  deleteTeamAction,
} from "@/app/admin/actions";
import { getLeagueDetail } from "@/db/queries";

function toDateInput(d: Date | null) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

const ROLE_LABEL = {
  captain: "Captain",
  co_captain: "Co-captain",
  player: "Player",
} as const;

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
        backLabel="Back to admin"
        action={<Badge variant="secondary">Level {league.skillLevel}</Badge>}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">League settings</CardTitle>
          <CardDescription>
            Update the name, level, season dates, or status.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <EditLeagueForm
            leagueId={league.id}
            initial={{
              name: league.name,
              skillLevel: league.skillLevel,
              status: league.status,
              seasonStart: toDateInput(league.seasonStart),
              seasonEnd: toDateInput(league.seasonEnd),
            }}
          />
          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Deleting a league removes its teams and rosters.
            </p>
            <DeleteButton
              action={deleteLeagueAction.bind(null, league.id)}
              confirmMessage={`Delete "${league.name}" and all of its teams? This cannot be undone.`}
              label="Delete league"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Teams</CardTitle>
          <CardDescription>
            Add a team and optionally set its captain by email — they&apos;ll be
            linked automatically when they sign up.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <CreateTeamForm leagueId={league.id} />

          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams yet.</p>
          ) : (
            <div className="flex flex-col divide-y">
              {teams.map((team) => (
                <div key={team.id} className="flex flex-col gap-3 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{team.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {team.members.length}
                          {team.rosterCap ? `/${team.rosterCap}` : ""} member
                          {team.members.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Captain:{" "}
                        {team.captain ? (
                          <span className="text-foreground">
                            {team.captain.name ?? team.captain.email}
                            {!team.captain.claimed && " (invite pending)"}
                          </span>
                        ) : (
                          "none yet"
                        )}
                      </p>
                    </div>
                    <DeleteButton
                      action={deleteTeamAction.bind(null, league.id, team.id)}
                      confirmMessage={`Delete team "${team.name}"?`}
                    />
                  </div>

                  {team.members.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {team.members.map((m) => (
                        <Badge
                          key={m.membershipId}
                          variant={m.role === "player" ? "outline" : "secondary"}
                        >
                          {m.name ?? m.email} · {ROLE_LABEL[m.role]}
                          {!m.claimed && " (pending)"}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Captain
                      </span>
                      <AssignCaptainForm
                        leagueId={league.id}
                        teamId={team.id}
                        hasCaptain={team.captain !== null}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Add player
                      </span>
                      <AddPlayerForm leagueId={league.id} teamId={team.id} />
                    </div>
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
