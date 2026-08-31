import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { DivisionDirectory } from "@/components/division-directory";
import { PageHeader } from "@/components/page-header";
import { getLeaguePublic } from "@/db/queries";

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
            <DivisionDirectory divisions={divisions} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
