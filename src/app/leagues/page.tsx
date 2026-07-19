import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { listPublicLeagues } from "@/db/queries";

function formatDate(d: Date | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });
}

export default async function LeaguesPage() {
  const leagues = await listPublicLeagues();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leagues"
        description="Browse leagues and view standings."
      />

      <Card>
        <CardContent>
          {leagues.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No open leagues right now. Check back soon.
            </p>
          ) : (
            <div className="flex flex-col divide-y">
              <div className="-mx-2 grid grid-cols-[2fr_1fr_1.5fr] items-center gap-4 px-2 pb-2 text-xs font-medium text-muted-foreground">
                <span>League Name</span>
                <span>Level</span>
                <span>Season</span>
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
                    className="relative -mx-2 grid grid-cols-[2fr_1fr_1.5fr] items-center gap-4 px-2 py-3 transition-colors hover:bg-muted/50"
                  >
                    <Link
                      href={`/leagues/${league.id}`}
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
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
