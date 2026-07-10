import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listPublicLeagues } from "@/db/queries";

export default async function LeaguesPage() {
  const leagues = await listPublicLeagues();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leagues</h1>
        <p className="text-muted-foreground">
          Browse teams by skill level and request to join.
        </p>
      </div>

      {leagues.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No open leagues right now. Check back soon.
        </p>
      ) : (
        leagues.map(({ league, teams }) => (
          <section key={league.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Link
                href={`/leagues/${league.id}`}
                className="text-lg font-semibold hover:underline"
              >
                {league.name}
              </Link>
              <Badge variant="outline">Level {league.skillLevel}</Badge>
              {league.status === "completed" && (
                <Badge variant="secondary">Completed</Badge>
              )}
              <Link
                href={`/leagues/${league.id}`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Standings →
              </Link>
            </div>
            {teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No teams in this league yet.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {teams.map((team) => (
                  <Link key={team.id} href={`/teams/${team.id}`}>
                    <Card className="h-full transition-colors hover:border-foreground/30">
                      <CardHeader>
                        <CardTitle className="text-base">{team.name}</CardTitle>
                        <CardDescription>
                          {team.members.length}
                          {team.rosterCap ? `/${team.rosterCap}` : ""} member
                          {team.members.length === 1 ? "" : "s"}
                          {team.captain &&
                            ` · Captain ${team.captain.name ?? team.captain.email}`}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
