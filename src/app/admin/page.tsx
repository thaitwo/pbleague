import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateLeagueDialog } from "@/components/admin/create-league-dialog";
import { PageHeader } from "@/components/page-header";
import { getDisputedMatches, listLeagues } from "@/db/queries";

const STATUS_VARIANT = {
  draft: "secondary",
  active: "default",
  completed: "outline",
} as const;

function formatDate(d: Date | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AdminPage() {
  const [leagues, disputes] = await Promise.all([
    listLeagues(),
    getDisputedMatches(),
  ]);

  return (
    <>
      <PageHeader
        title="Admin console"
        description="Create leagues by skill level and build out their teams."
        action={<CreateLeagueDialog />}
      />

      {disputes.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">
              Disputed scores need your review
            </CardTitle>
            <CardDescription>
              Open a match and use “Resolve score” to set the final result.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y">
              {disputes.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="text-sm">
                    {m.homeTeamName} vs {m.awayTeamName}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/teams/${m.homeTeamId}`} />}
                  >
                    Resolve
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Leagues</h2>
        {leagues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No leagues yet — use “Create league” to add your first one.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {leagues.map((league) => {
              const start = formatDate(league.seasonStart);
              const end = formatDate(league.seasonEnd);
              return (
                <Link key={league.id} href={`/admin/leagues/${league.id}`}>
                  <Card className="transition-colors hover:border-foreground/30">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base">
                          {league.name}
                        </CardTitle>
                        <Badge variant={STATUS_VARIANT[league.status]}>
                          {league.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        Level {league.skillLevel}
                        {start && ` · ${start}${end ? ` – ${end}` : ""}`}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
