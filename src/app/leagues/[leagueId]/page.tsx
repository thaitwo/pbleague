import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { getLeaguePublic } from "@/db/queries";
import { divisionDisplayName } from "@/lib/constants";

function fmtDate(d: Date | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function seasonLabel(start: Date | null, end: Date | null) {
  const s = fmtDate(start);
  const e = fmtDate(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return `Starts ${s}`;
  if (e) return `Ends ${e}`;
  return undefined;
}

export default async function LeagueDivisionsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const data = await getLeaguePublic(leagueId);
  if (!data) notFound();

  const { league, divisions } = data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={league.name}
        description={seasonLabel(league.seasonStart, league.seasonEnd)}
        backHref="/leagues"
      />

      <Card>
        <CardContent>
          {divisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No divisions in this league yet.
            </p>
          ) : (
            <div className="flex flex-col divide-y">
              <div className="-mx-2 grid grid-cols-[2fr_1.25fr_0.75fr] items-center gap-4 px-2 pb-2 text-xs font-medium text-muted-foreground">
                <span>Division</span>
                <span>Age group</span>
                <span>Teams</span>
              </div>
              {divisions.map((d) => (
                <div
                  key={d.id}
                  className="relative -mx-2 grid grid-cols-[2fr_1.25fr_0.75fr] items-center gap-4 px-2 py-3 transition-colors hover:bg-muted/50"
                >
                  <Link
                    href={`/divisions/${d.id}`}
                    className="min-w-0 truncate font-medium after:absolute after:inset-0"
                  >
                    {divisionDisplayName(d)}
                  </Link>
                  <span className="min-w-0 truncate text-sm text-muted-foreground">
                    {d.ageGroup}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {d.teamCount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
