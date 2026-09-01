import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateDivisionDialog } from "@/components/admin/create-division-dialog";
import { DivisionRowActions } from "@/components/admin/division-row-actions";
import { EditLeagueDialog } from "@/components/admin/edit-league-dialog";
import { PageHeader } from "@/components/page-header";
import { getLeagueDetail } from "@/db/queries";
import { divisionDisplayName } from "@/lib/constants";
import { seasonLabel } from "@/lib/format";

const STATUS_VARIANT = {
  draft: "secondary",
  active: "default",
  completed: "outline",
} as const;

function toDateInput(d: Date | null) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const detail = await getLeagueDetail(leagueId);
  if (!detail) notFound();

  const { league, divisions } = detail;

  return (
    <>
      <PageHeader
        title={league.name}
        description={seasonLabel(league.seasonStart, league.seasonEnd)}
        backHref="/admin"
        action={
          <div className="flex items-center gap-2">
            <EditLeagueDialog
              leagueId={league.id}
              leagueName={league.name}
              initial={{
                name: league.name,
                status: league.status,
                seasonStart: toDateInput(league.seasonStart),
                seasonEnd: toDateInput(league.seasonEnd),
              }}
            />
            <CreateDivisionDialog leagueId={league.id} />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Divisions</CardTitle>
        </CardHeader>
        <CardContent>
          {divisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No divisions yet — use “Add division” to create the first rating
              flight.
            </p>
          ) : (
            <div className="flex flex-col divide-y">
              <div className="-mx-2 grid grid-cols-[2fr_1fr_1fr_0.75fr_1.75rem] items-center gap-4 px-2 pb-2 text-xs font-medium text-muted-foreground">
                <span>Division</span>
                <span>Age group</span>
                <span>Status</span>
                <span>Teams</span>
                <span className="sr-only">Actions</span>
              </div>
              {divisions.map((d) => {
                const label = divisionDisplayName(d);
                return (
                  <div
                    key={d.id}
                    className="relative -mx-2 grid grid-cols-[2fr_1fr_1fr_0.75fr_1.75rem] items-center gap-4 px-2 py-3 transition-colors hover:bg-muted/50"
                  >
                    <Link
                      href={`/admin/divisions/${d.id}`}
                      className="min-w-0 truncate font-medium after:absolute after:inset-0"
                    >
                      {label}
                    </Link>
                    <span className="min-w-0 truncate text-sm text-muted-foreground">
                      {d.ageGroup}
                    </span>
                    <Badge
                      variant={STATUS_VARIANT[d.status]}
                      className="justify-self-start"
                    >
                      {d.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {d.teamCount}
                    </span>
                    <div className="relative z-10">
                      <DivisionRowActions
                        leagueId={league.id}
                        divisionId={d.id}
                        divisionLabel={label}
                        initial={{
                          name: d.name ?? "",
                          rating: d.rating,
                          ratingType: d.ratingType,
                          gender: d.gender,
                          ageGroup: d.ageGroup,
                          status: d.status,
                          seasonStart: toDateInput(d.seasonStart),
                          seasonEnd: toDateInput(d.seasonEnd),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
