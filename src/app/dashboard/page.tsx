import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { getUserMatches, getUserTeams } from "@/db/queries";
import { auth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

const ROLE_LABEL = {
  captain: "Captain",
  co_captain: "Co-captain",
  player: "Player",
} as const;

const MATCH_STATUS_LABEL = {
  unscheduled: "Not scheduled",
  proposed: "Proposed",
  scheduled: "Scheduled",
  completed: "Played",
  confirmed: "Confirmed",
  disputed: "Disputed",
  cancelled: "Cancelled",
} as const;

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }

  const { user } = session;
  const profileIncomplete = !user.skillLevel;
  const myTeams = await getUserTeams(user.id);
  const { matches: myMatches, myTeamIds } = await getUserMatches(user.id);

  const myTeamIdSet = new Set(myTeamIds);
  const matchRows = myMatches
    .map((m) => {
      const mineIsHome = myTeamIdSet.has(m.homeTeamId);
      const myTeamId = mineIsHome ? m.homeTeamId : m.awayTeamId;
      return {
        id: m.id,
        myTeamId,
        myTeamName: mineIsHome ? m.homeTeamName : m.awayTeamName,
        opponentName: mineIsHome ? m.awayTeamName : m.homeTeamName,
        whenLabel: formatDateTime(m.scheduledAt),
        scheduledAt: m.scheduledAt,
        status: m.status,
        needsResponse:
          m.status === "proposed" && m.proposedByTeamId !== myTeamId,
      };
    })
    .sort((a, b) => {
      if (a.needsResponse !== b.needsResponse) return a.needsResponse ? -1 : 1;
      return (
        (a.scheduledAt?.getTime() ?? 0) - (b.scheduledAt?.getTime() ?? 0)
      );
    });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description="Here's what's happening across your teams."
      />

      {profileIncomplete && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <CardHeader>
            <CardTitle className="text-base">Finish your profile</CardTitle>
            <CardDescription>
              Add your skill level so captains know which leagues fit you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" render={<Link href="/profile" />}>
              Complete profile
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">My teams</CardTitle>
            <Button variant="outline" size="sm" render={<Link href="/leagues" />}>
              Browse leagues
            </Button>
          </div>
          <CardDescription>
            Teams you&apos;ve joined or requested to join.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You&apos;re not on any teams yet.{" "}
              <Link href="/leagues" className="underline hover:text-foreground">
                Find a team to join.
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {myTeams.map((t) => (
                <li key={t.teamId}>
                  <Link
                    href={`/teams/${t.teamId}`}
                    className="flex items-center justify-between gap-3 py-3 hover:opacity-80"
                  >
                    <div>
                      <div className="text-sm font-medium">{t.teamName}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.leagueName} · Level {t.leagueLevel}
                      </div>
                    </div>
                    {t.status === "pending" ? (
                      <Badge variant="outline">Request pending</Badge>
                    ) : (
                      <Badge variant="secondary">{ROLE_LABEL[t.role]}</Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My matches</CardTitle>
          <CardDescription>
            Upcoming and proposed matches across all your teams.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {matchRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No matches yet. Captains can propose one from a team&apos;s page.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {matchRows.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/teams/${m.myTeamId}`}
                    className="flex items-center justify-between gap-3 py-3 hover:opacity-80"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {m.myTeamName} vs {m.opponentName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {m.whenLabel}
                      </div>
                    </div>
                    {m.needsResponse ? (
                      <Badge>Needs response</Badge>
                    ) : (
                      <Badge variant="secondary">
                        {MATCH_STATUS_LABEL[m.status]}
                      </Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Email</span>
            <span>{user.email}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Skill level</span>
            <span>{user.skillLevel ?? "Not set"}</span>
          </div>
          <div className="flex justify-between pb-2">
            <span className="text-muted-foreground">Phone</span>
            <span>{user.phone ?? "Not set"}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            render={<Link href="/profile" />}
          >
            Edit profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
