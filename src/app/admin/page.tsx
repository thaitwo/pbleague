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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Leagues — left column */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leagues</CardTitle>
            </CardHeader>
            <CardContent>
              {leagues.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No leagues yet — use “Create league” to add your first one.
                </p>
              ) : (
                <div className="flex flex-col divide-y">
                  <div className="-mx-2 grid grid-cols-[2fr_1fr_1.5fr_1fr] items-center gap-4 px-2 pb-2 text-xs font-medium text-muted-foreground">
                    <span>League Name</span>
                    <span>Level</span>
                    <span>Season</span>
                    <span>Status</span>
                  </div>
                  {leagues.map((league) => {
                    const start = formatDate(league.seasonStart);
                    const end = formatDate(league.seasonEnd);
                    const season = start
                      ? `${start}${end ? ` – ${end}` : ""}`
                      : "—";
                    return (
                      <div
                        key={league.id}
                        className="relative -mx-2 grid grid-cols-[2fr_1fr_1.5fr_1fr] items-center gap-4 px-2 py-3 transition-colors hover:bg-muted/50"
                      >
                        <Link
                          href={`/admin/leagues/${league.id}`}
                          className="min-w-0 truncate font-medium after:absolute after:inset-0"
                        >
                          {league.name}
                        </Link>
                        <span className="min-w-0 truncate text-sm text-muted-foreground">
                          {league.skillLevel}
                        </span>
                        <span className="min-w-0 truncate text-sm text-muted-foreground">
                          {season}
                        </span>
                        <Badge
                          variant={STATUS_VARIANT[league.status]}
                          className="justify-self-start"
                        >
                          {league.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Disputed scores — right column */}
        <div>
          <Card
            className={disputes.length > 0 ? "border-destructive/40" : undefined}
          >
            <CardHeader>
              <CardTitle className="text-base">
                {disputes.length > 0
                  ? "Disputed scores need your review"
                  : "Disputed scores"}
              </CardTitle>
              <CardDescription>
                {disputes.length > 0
                  ? "Open a match and use “Resolve score” to set the final result."
                  : "Disputed scores show up here for you to resolve."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {disputes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No disputed scores.
                </p>
              ) : (
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
