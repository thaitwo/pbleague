import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ActionButton } from "@/components/teams/action-button";
import { InvitePanel } from "@/components/teams/invite-panel";
import { MatchCard } from "@/components/teams/match-card";
import { ProposeMatchForm } from "@/components/teams/propose-match-form";
import {
  approveRequestAction,
  declineRequestAction,
  demoteCoCaptainAction,
  promoteCoCaptainAction,
  removeMemberAction,
  requestToJoinAction,
} from "@/app/teams/actions";
import { autoConfirmStaleScores } from "@/db/mutations";
import {
  getTeamMatches,
  getTeamPage,
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

const ROLE_ORDER = { captain: 0, co_captain: 1, player: 2 } as const;

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
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
  const opponents = isManager
    ? await listLeagueTeamsExcept(league.id, teamId)
    : [];
  const isAdmin = session?.user.role === "admin";

  const viewerId = session?.user.id;
  const viewerActive = members.some((m) => m.userId === viewerId);
  const viewerPending = pendingRequests.some((m) => m.userId === viewerId);

  const roster = [...members].sort(
    (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/leagues"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All leagues
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{league.name}</Badge>
            <Badge variant="outline">Level {league.skillLevel}</Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {members.length}
          {team.rosterCap ? `/${team.rosterCap}` : ""} member
          {members.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Join / membership status */}
      {!viewerActive && (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 py-4">
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
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Roster */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roster</CardTitle>
          <CardDescription>
            Captain:{" "}
            {roster.find((m) => m.role === "captain")?.name ??
              roster.find((m) => m.role === "captain")?.email ??
              "not set"}
          </CardDescription>
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
                    <Badge
                      variant={m.role === "player" ? "outline" : "secondary"}
                    >
                      {ROLE_LABEL[m.role]}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {isLeadership &&
                      m.role !== "captain" &&
                      (m.role === "co_captain" ? (
                        <ActionButton
                          action={demoteCoCaptainAction.bind(
                            null,
                            teamId,
                            m.membershipId,
                          )}
                          label="Remove co-captain"
                          variant="outline"
                        />
                      ) : (
                        <ActionButton
                          action={promoteCoCaptainAction.bind(
                            null,
                            teamId,
                            m.membershipId,
                          )}
                          label="Make co-captain"
                          variant="outline"
                        />
                      ))}
                    {isManager &&
                      m.role !== "captain" &&
                      m.userId !== viewerId && (
                        <ActionButton
                          action={removeMemberAction.bind(
                            null,
                            teamId,
                            m.membershipId,
                          )}
                          label="Remove"
                          variant="destructive"
                          confirm={`Remove ${m.name ?? m.email} from ${team.name}?`}
                        />
                      )}
                  </div>
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
            Propose matches against other teams in {league.name}; the other
            captain accepts or counters with a new time.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {isManager &&
            (opponents.length > 0 ? (
              <ProposeMatchForm teamId={teamId} opponents={opponents} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No other teams in this league yet — an admin needs to add one to
                schedule a match.
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
  );
}
