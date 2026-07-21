import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EditTeamDialog } from "@/components/admin/edit-team-dialog";
import { AddPlayerDialog } from "@/components/admin/add-player-dialog";
import { ActionButton } from "@/components/teams/action-button";
import { InvitePanel } from "@/components/teams/invite-panel";
import { MatchCard } from "@/components/teams/match-card";
import { ProposeMatchForm } from "@/components/teams/propose-match-form";
import { RosterRowActions } from "@/components/teams/roster-row-actions";
import { PageHeader } from "@/components/page-header";
import {
  approveRequestAction,
  declineRequestAction,
  requestToJoinAction,
} from "@/app/teams/actions";
import { autoConfirmStaleScores } from "@/db/mutations";
import {
  getTeamMatches,
  getTeamPage,
  leagueHasSchedule,
  listLeagueTeamsExcept,
} from "@/db/queries";
import { getSession } from "@/lib/auth-guard";
import { formatDateTime } from "@/lib/format";
import { canManageLeadership, canManageTeam } from "@/lib/team-perms";

const ROLE_LABEL = {
  captain: "Captain",
  co_captain: "Co-captain",
  player: "Player",
} as const;

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { teamId } = await params;
  const { from } = await searchParams;
  const data = await getTeamPage(teamId);
  if (!data) notFound();

  const { team, league, members, pendingRequests } = data;
  const session = await getSession();
  const isManager = await canManageTeam(session, teamId);
  const isLeadership = await canManageLeadership(session, teamId);

  const requestHeaders = await headers();
  const origin = `${requestHeaders.get("x-forwarded-proto") ?? "http"}://${
    requestHeaders.get("host") ?? "localhost:3000"
  }`;

  await autoConfirmStaleScores();
  const teamMatches = await getTeamMatches(teamId);
  const hasSchedule = await leagueHasSchedule(league.id);
  // Ad-hoc proposals are only offered when the admin hasn't set a schedule.
  const opponents = isManager && !hasSchedule
    ? await listLeagueTeamsExcept(league.id, teamId)
    : [];
  const isAdmin = session?.user.role === "admin";

  const viewerId = session?.user.id;
  const viewerActive = members.some((m) => m.userId === viewerId);
  const viewerPending = pendingRequests.some((m) => m.userId === viewerId);

  const roster = [...members].sort((a, b) =>
    (a.name ?? a.email).localeCompare(b.name ?? b.email, undefined, {
      sensitivity: "base",
    }),
  );
  const captain = roster.find((m) => m.role === "captain");
  const coCaptain = roster.find((m) => m.role === "co_captain");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={team.name}
        backHref={
          from === "admin" && isAdmin
            ? `/admin/leagues/${league.id}`
            : from === "league"
              ? `/leagues/${league.id}`
              : "/leagues"
        }
        description={`${members.length}${
          team.rosterCap ? `/${team.rosterCap}` : ""
        } member${members.length === 1 ? "" : "s"}`}
        titleExtra={
          <>
            <Badge variant="secondary">{league.name}</Badge>
            <Badge variant="outline">Level {league.skillLevel}</Badge>
          </>
        }
        action={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <EditTeamDialog
                leagueId={league.id}
                team={{
                  id: team.id,
                  name: team.name,
                  area: team.area,
                  rosterCap: team.rosterCap,
                  hasCaptain: members.some((m) => m.role === "captain"),
                }}
                triggerLabel="Edit team"
              />
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Roster */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Roster</CardTitle>
              <CardDescription>
                <span className="block">
                  Captain: {captain?.name ?? captain?.email ?? "not set"}
                </span>
                <span className="block">
                  Co-captain:{" "}
                  {coCaptain?.name ?? coCaptain?.email ?? "not set"}
                </span>
              </CardDescription>
              {isAdmin && (
                <CardAction>
                  <AddPlayerDialog leagueId={league.id} teamId={team.id} />
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              {roster.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active members yet.
                </p>
              ) : (
                <ul className="flex flex-col divide-y">
                  {roster.map((m) => (
                    <li
                      key={m.membershipId}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {m.name ?? m.email}
                          {m.userId === viewerId && " (you)"}
                        </span>
                        {m.role !== "player" && (
                          <Badge variant="secondary">{ROLE_LABEL[m.role]}</Badge>
                        )}
                      </div>
                      <RosterRowActions
                        teamId={teamId}
                        membershipId={m.membershipId}
                        memberName={m.name ?? m.email}
                        role={m.role}
                        canLead={isLeadership}
                        canManage={isManager}
                        isSelf={m.userId === viewerId}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schedule</CardTitle>
              <CardDescription>
                {hasSchedule
                  ? "Your league schedule is set. Set the date & time for your home matches; away matches are scheduled by the host."
                  : `Propose matches against other teams in ${league.name}; the other captain accepts or counters with a new time.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {isManager &&
                !hasSchedule &&
                (opponents.length > 0 ? (
                  <ProposeMatchForm teamId={teamId} opponents={opponents} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No other teams in this league yet — an admin needs to add one
                    to schedule a match.
                  </p>
                ))}

              {teamMatches.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No matches scheduled yet.
                </p>
              ) : (
                <div className="flex flex-col divide-y">
                  {teamMatches.map((m) => {
                    const isHome = m.homeTeamId === teamId;
                    return (
                      <MatchCard
                        key={m.id}
                        matchId={m.id}
                        myTeamId={teamId}
                        opponentName={isHome ? m.awayTeamName : m.homeTeamName}
                        whenLabel={formatDateTime(m.scheduledAt)}
                        location={m.location}
                        status={m.status}
                        isProposer={m.proposedByTeamId === teamId}
                        isLeagueFixture={m.proposedByTeamId === null}
                        canManage={isManager}
                        isHome={isHome}
                        games={m.games.map((g) => ({
                          my: isHome ? g.homeScore : g.awayScore,
                          opp: isHome ? g.awayScore : g.homeScore,
                        }))}
                        iEnteredScore={m.scoreEnteredByTeamId === teamId}
                        isAdmin={isAdmin}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Pending requests (managers only) */}
          {isManager && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Join requests{" "}
                  {pendingRequests.length > 0 && (
                    <Badge variant="secondary">{pendingRequests.length}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Approve to add a player to the roster.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No pending requests.
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y">
                    {pendingRequests.map((r) => (
                      <li
                        key={r.membershipId}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <span className="text-sm font-medium">
                          {r.name ?? r.email}
                        </span>
                        <div className="flex gap-2">
                          <ActionButton
                            action={approveRequestAction.bind(
                              null,
                              teamId,
                              r.membershipId,
                            )}
                            label="Approve"
                          />
                          <ActionButton
                            action={declineRequestAction.bind(
                              null,
                              teamId,
                              r.membershipId,
                            )}
                            label="Decline"
                            variant="outline"
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {/* Join / membership status */}
          {!viewerActive && (
            <Card>
              <CardContent className="flex flex-col items-start gap-3 py-4">
                {!session ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Sign in to request a spot on this team.
                    </p>
                    <Button size="sm" render={<Link href="/sign-in" />}>
                      Sign in
                    </Button>
                  </>
                ) : viewerPending ? (
                  <p className="text-sm text-muted-foreground">
                    Your request to join is pending a captain&apos;s approval.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Want in? Send a request and a captain will review it.
                    </p>
                    <ActionButton
                      action={requestToJoinAction.bind(null, teamId)}
                      label="Request to join"
                      pendingLabel="Sending…"
                      variant="outline"
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Invite link (managers only) */}
          {isManager && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invite link</CardTitle>
              </CardHeader>
              <CardContent>
                <InvitePanel
                  teamId={teamId}
                  initialToken={team.inviteToken}
                  origin={origin}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
