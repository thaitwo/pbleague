import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { listPublicLeagues } from "@/db/queries";

function fmt(d: Date | null) {
  return d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
      })
    : null;
}

function dateRange(start: Date | null, end: Date | null) {
  const s = fmt(start);
  const e = fmt(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return `Starts ${s}`;
  if (e) return `Ends ${e}`;
  return "Dates TBD";
}

export default async function LeaguesPage() {
  const leagues = await listPublicLeagues();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leagues"
        description="Browse leagues and view standings."
      />

      {leagues.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No open leagues right now. Check back soon.
        </p>
      ) : (
        <div className="flex flex-col divide-y">
          {leagues.map((league) => (
            <Link
              key={league.id}
              href={`/leagues/${league.id}`}
              className="-mx-3 flex items-center justify-between gap-4 px-3 py-4 hover:bg-muted"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{league.name}</span>
                {league.status === "completed" && (
                  <Badge variant="secondary">Completed</Badge>
                )}
              </div>
              <div className="flex items-center gap-6">
                <span className="text-sm text-muted-foreground">
                  {dateRange(league.seasonStart, league.seasonEnd)}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
