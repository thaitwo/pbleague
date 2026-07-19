"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScoreEntryForm } from "@/components/teams/score-entry-form";
import {
  acceptMatchAction,
  cancelMatchAction,
  confirmScoreAction,
  counterMatchAction,
  disputeScoreAction,
  enterScoreAction,
  resolveScoreAction,
  setFixtureTimeAction,
  type RowActionResult,
} from "@/app/teams/actions";
import type { MatchStatus } from "@/db/queries";

const STATUS_VARIANT: Record<
  MatchStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  unscheduled: "outline",
  proposed: "outline",
  scheduled: "default",
  completed: "secondary",
  confirmed: "secondary",
  disputed: "destructive",
  cancelled: "outline",
};

const STATUS_LABEL: Record<MatchStatus, string> = {
  unscheduled: "Not scheduled",
  proposed: "Proposed",
  scheduled: "Scheduled",
  completed: "Awaiting confirmation",
  confirmed: "Final",
  disputed: "Disputed",
  cancelled: "Cancelled",
};

type Game = { my: number; opp: number };

type MatchCardProps = {
  matchId: string;
  myTeamId: string;
  opponentName: string;
  whenLabel: string;
  location: string | null;
  status: MatchStatus;
  isProposer: boolean;
  isLeagueFixture: boolean;
  canManage: boolean;
  isHome: boolean;
  games: Game[];
  iEnteredScore: boolean;
  isAdmin: boolean;
};

export function MatchCard({
  matchId,
  myTeamId,
  opponentName,
  whenLabel,
  location,
  status,
  isProposer,
  isLeagueFixture,
  canManage,
  isHome,
  games,
  iEnteredScore,
  isAdmin,
}: MatchCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [countering, setCountering] = useState(false);
  const [when, setWhen] = useState("");
  const [loc, setLoc] = useState(location ?? "");
  // null = closed, "enter" = record via my team, "resolve" = admin override
  const [scoreMode, setScoreMode] = useState<null | "enter" | "resolve">(null);

  const awaitingMe = status === "proposed" && !isProposer;
  const awaitingThem = status === "proposed" && isProposer;
  // Admin-generated fixture with no date yet — the home captain sets the time.
  const isUnscheduled = status === "unscheduled";
  const canSetTime = canManage && isUnscheduled && isHome;

  const myGamesWon = games.filter((g) => g.my > g.opp).length;
  const oppGamesWon = games.filter((g) => g.opp > g.my).length;
  const iWon = myGamesWon > oppGamesWon;
  const scoreLine = games.map((g) => `${g.my}–${g.opp}`).join(", ");

  function run(fn: () => Promise<RowActionResult>) {
    startTransition(async () => {
      const result = await fn();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result?.message) toast.success(result.message);
      setCountering(false);
      setScoreMode(null);
      router.refresh();
    });
  }

  function toHomeAway(entered: { myScore: number; oppScore: number }[]) {
    return entered.map((g) =>
      isHome
        ? { homeScore: g.myScore, awayScore: g.oppScore }
        : { homeScore: g.oppScore, awayScore: g.myScore },
    );
  }

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium">vs {opponentName}</div>
          <div className="text-sm text-muted-foreground">
            {whenLabel}
            {location ? ` · ${location}` : ""}
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
      </div>

      {games.length > 0 && status !== "cancelled" && (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{scoreLine}</span>
          {status === "confirmed" && (
            <Badge variant={iWon ? "default" : "secondary"}>
              {iWon ? "Won" : "Lost"}
            </Badge>
          )}
        </div>
      )}

      {isUnscheduled && !isHome && (
        <p className="text-sm text-muted-foreground">
          Waiting for {opponentName} (home) to set the date & time.
        </p>
      )}
      {isUnscheduled && isHome && !canManage && (
        <p className="text-sm text-muted-foreground">
          Your team hosts this match — a captain needs to set the date & time.
        </p>
      )}
      {awaitingThem && (
        <p className="text-sm text-muted-foreground">
          Waiting for {opponentName} to accept or counter.
        </p>
      )}
      {awaitingMe && !canManage && (
        <p className="text-sm text-muted-foreground">
          {opponentName} proposed this time — a captain needs to respond.
        </p>
      )}
      {status === "completed" && iEnteredScore && (
        <p className="text-sm text-muted-foreground">
          Waiting for {opponentName} to confirm the score.
        </p>
      )}
      {status === "disputed" && (
        <p className="text-sm text-muted-foreground">
          {iEnteredScore
            ? `${opponentName} disputed this score — an admin will resolve it.`
            : "You disputed this score — an admin will resolve it."}
        </p>
      )}

      {/* Scheduling actions */}
      {canManage && (
        <div className="flex flex-wrap gap-2">
          {canSetTime && (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => setCountering((v) => !v)}
            >
              {countering ? "Close" : "Set date & time"}
            </Button>
          )}
          {awaitingMe && (
            <>
              <Button
                size="sm"
                disabled={pending}
                onClick={() => run(() => acceptMatchAction(matchId))}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => setCountering((v) => !v)}
              >
                {countering ? "Close" : "Counter"}
              </Button>
            </>
          )}
          {status === "scheduled" && (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => setScoreMode((m) => (m ? null : "enter"))}
            >
              {scoreMode ? "Close" : "Enter score"}
            </Button>
          )}
          {status === "completed" && !iEnteredScore && (
            <>
              <Button
                size="sm"
                disabled={pending}
                onClick={() => run(() => confirmScoreAction(matchId))}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => run(() => disputeScoreAction(matchId))}
              >
                Dispute
              </Button>
            </>
          )}
          {status === "completed" && iEnteredScore && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setScoreMode((m) => (m ? null : "enter"))}
            >
              {scoreMode ? "Close" : "Edit score"}
            </Button>
          )}
          {status === "disputed" && !isAdmin && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setScoreMode((m) => (m ? null : "enter"))}
            >
              {scoreMode ? "Close" : "Re-enter score"}
            </Button>
          )}
          {isLeagueFixture
            ? status === "scheduled" &&
              isHome && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Clear this match's date & time? You can set a new one.",
                      )
                    ) {
                      run(() => cancelMatchAction(matchId));
                    }
                  }}
                >
                  Clear date &amp; time
                </Button>
              )
            : (status === "proposed" || status === "scheduled") && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm("Cancel this match?")) {
                      run(() => cancelMatchAction(matchId));
                    }
                  }}
                >
                  Cancel
                </Button>
              )}
        </div>
      )}

      {/* Admin score override */}
      {isAdmin && (status === "disputed" || status === "confirmed") && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setScoreMode((m) => (m ? null : "resolve"))}
          >
            {scoreMode
              ? "Close"
              : status === "disputed"
                ? "Resolve score"
                : "Edit score (admin)"}
          </Button>
        </div>
      )}

      {/* Date & time form — counter-proposal or setting a fixture's time */}
      {canManage && countering && (awaitingMe || canSetTime) && (
        <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`when-${matchId}`}>
              {canSetTime ? "Date & time" : "New date & time"}
            </Label>
            <Input
              id={`when-${matchId}`}
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor={`loc-${matchId}`}>Location</Label>
            <Input
              id={`loc-${matchId}`}
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!when) {
                toast.error("Pick a date and time.");
                return;
              }
              run(() =>
                canSetTime
                  ? setFixtureTimeAction(matchId, myTeamId, when, loc)
                  : counterMatchAction(matchId, myTeamId, when, loc),
              );
            }}
          >
            {canSetTime ? "Save" : "Send counter"}
          </Button>
        </div>
      )}

      {/* Score entry / resolve form */}
      {scoreMode && (
        <ScoreEntryForm
          myLabel="Your score"
          oppLabel={opponentName}
          submitLabel={scoreMode === "resolve" ? "Save final score" : "Save score"}
          initialGames={games.map((g) => ({ myScore: g.my, oppScore: g.opp }))}
          onClose={() => setScoreMode(null)}
          onSubmit={(entered) =>
            scoreMode === "resolve"
              ? resolveScoreAction(matchId, toHomeAway(entered))
              : enterScoreAction(matchId, myTeamId, toHomeAway(entered))
          }
        />
      )}
    </div>
  );
}
