"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { formatDate } from "@/lib/format";

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
  unscheduled: "Not set",
  proposed: "Proposed",
  scheduled: "Scheduled",
  completed: "Awaiting",
  confirmed: "Final",
  disputed: "Disputed",
  cancelled: "Cancelled",
};

export type ScheduleMatch = {
  matchId: string;
  opponentName: string;
  scheduledAt: Date | null;
  location: string | null;
  status: MatchStatus;
  isProposer: boolean;
  isLeagueFixture: boolean;
  isHome: boolean;
  games: { my: number; opp: number }[];
  iEnteredScore: boolean;
};

type ScheduleTableProps = {
  myTeamId: string;
  matches: ScheduleMatch[];
  canManage: boolean;
  isAdmin: boolean;
};

type ActiveAction = {
  match: ScheduleMatch;
  mode: "time-set" | "time-counter" | "score-enter" | "score-resolve" | "cancel";
};

function formatTime(d: Date | null): string | null {
  if (!d) return null;
  return new Date(d).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ScheduleTable({
  myTeamId,
  matches,
  canManage,
  isAdmin,
}: ScheduleTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<ActiveAction | null>(null);
  const showActions = canManage || isAdmin;

  function run(fn: () => Promise<RowActionResult>) {
    startTransition(async () => {
      const result = await fn();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result?.message) toast.success(result.message);
      setActive(null);
      router.refresh();
    });
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Opponent</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Home/Away</TableHead>
            <TableHead>Location</TableHead>
            {showActions && (
              <TableHead className="w-7">
                <span className="sr-only">Actions</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((m) => {
            const myGamesWon = m.games.filter((g) => g.my > g.opp).length;
            const oppGamesWon = m.games.filter((g) => g.opp > g.my).length;
            const iWon = myGamesWon > oppGamesWon;
            const scoreLine =
              m.games.length > 0 && m.status !== "cancelled"
                ? m.games.map((g) => `${g.my}–${g.opp}`).join(", ")
                : "—";
            const date = formatDate(m.scheduledAt) ?? "TBD";
            const time = formatTime(m.scheduledAt) ?? "TBD";

            return (
              <TableRow key={m.matchId}>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[m.status]}>
                    {STATUS_LABEL[m.status]}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[9rem] truncate font-medium">
                  {m.opponentName}
                </TableCell>
                <TableCell>
                  {m.status === "confirmed" ? (
                    <Badge variant={iWon ? "default" : "secondary"}>
                      {iWon ? "Won" : "Lost"}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {scoreLine}
                </TableCell>
                <TableCell className="text-muted-foreground">{date}</TableCell>
                <TableCell className="text-muted-foreground">{time}</TableCell>
                <TableCell>{m.isHome ? "Home" : "Away"}</TableCell>
                <TableCell className="max-w-[8rem] truncate text-muted-foreground">
                  {m.location ?? "—"}
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <RowMenu
                      match={m}
                      canManage={canManage}
                      isAdmin={isAdmin}
                      pending={pending}
                      onInline={run}
                      onDialog={(mode) => setActive({ match: m, mode })}
                    />
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {active?.mode === "time-set" || active?.mode === "time-counter" ? (
        <TimeDialog
          key={active.match.matchId}
          match={active.match}
          mode={active.mode}
          myTeamId={myTeamId}
          onClose={() => setActive(null)}
        />
      ) : null}

      {active?.mode === "score-enter" || active?.mode === "score-resolve" ? (
        <Dialog open onOpenChange={(o) => !o && setActive(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {active.mode === "score-resolve"
                  ? "Resolve score"
                  : "Enter score"}
              </DialogTitle>
              <DialogDescription>
                vs {active.match.opponentName}
              </DialogDescription>
            </DialogHeader>
            <ScoreEntryForm
              myLabel="Your score"
              oppLabel={active.match.opponentName}
              submitLabel={
                active.mode === "score-resolve"
                  ? "Save final score"
                  : "Save score"
              }
              initialGames={active.match.games.map((g) => ({
                myScore: g.my,
                oppScore: g.opp,
              }))}
              onClose={() => setActive(null)}
              onSubmit={(entered) => {
                const games = entered.map((g) =>
                  active.match.isHome
                    ? { homeScore: g.myScore, awayScore: g.oppScore }
                    : { homeScore: g.oppScore, awayScore: g.myScore },
                );
                return active.mode === "score-resolve"
                  ? resolveScoreAction(active.match.matchId, games)
                  : enterScoreAction(active.match.matchId, myTeamId, games);
              }}
            />
          </DialogContent>
        </Dialog>
      ) : null}

      {active?.mode === "cancel" ? (
        <Dialog open onOpenChange={(o) => !o && setActive(null)}>
          <DialogContent
            className="max-w-sm"
            overlayClassName="bg-black/30 backdrop-blur-md"
          >
            <DialogHeader>
              <DialogTitle>
                {active.match.isLeagueFixture
                  ? "Clear date & time?"
                  : "Cancel this match?"}
              </DialogTitle>
              <DialogDescription>
                {active.match.isLeagueFixture
                  ? "The date & time is cleared so it can be set again."
                  : `This cancels your match vs ${active.match.opponentName}.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setActive(null)}
              >
                Keep
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => run(() => cancelMatchAction(active.match.matchId))}
              >
                {active.match.isLeagueFixture
                  ? "Clear date & time"
                  : "Cancel match"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

function RowMenu({
  match: m,
  canManage,
  isAdmin,
  pending,
  onInline,
  onDialog,
}: {
  match: ScheduleMatch;
  canManage: boolean;
  isAdmin: boolean;
  pending: boolean;
  onInline: (fn: () => Promise<RowActionResult>) => void;
  onDialog: (mode: ActiveAction["mode"]) => void;
}) {
  const awaitingMe = m.status === "proposed" && !m.isProposer;
  const canSetTime = canManage && m.status === "unscheduled" && m.isHome;
  const canAcceptCounter = canManage && awaitingMe;
  const canEnterScore = canManage && m.status === "scheduled";
  const canConfirmDispute =
    canManage && m.status === "completed" && !m.iEnteredScore;
  const canEditScore =
    canManage && m.status === "completed" && m.iEnteredScore;
  const canReenter = canManage && m.status === "disputed" && !isAdmin;
  const canResolve =
    isAdmin && (m.status === "disputed" || m.status === "confirmed");
  const canClear =
    canManage && m.isLeagueFixture && m.status === "scheduled" && m.isHome;
  const canCancel =
    canManage &&
    !m.isLeagueFixture &&
    (m.status === "proposed" || m.status === "scheduled");

  const hasActions =
    canSetTime ||
    canAcceptCounter ||
    canEnterScore ||
    canConfirmDispute ||
    canEditScore ||
    canReenter ||
    canResolve ||
    canClear ||
    canCancel;

  if (!hasActions) {
    return <span className="sr-only">No actions</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Match actions"
            disabled={pending}
          >
            <MoreVertical className="text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-auto min-w-40">
        {canSetTime && (
          <DropdownMenuItem onClick={() => onDialog("time-set")}>
            Set date &amp; time
          </DropdownMenuItem>
        )}
        {canAcceptCounter && (
          <>
            <DropdownMenuItem
              onClick={() => onInline(() => acceptMatchAction(m.matchId))}
            >
              Accept
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDialog("time-counter")}>
              Counter
            </DropdownMenuItem>
          </>
        )}
        {canEnterScore && (
          <DropdownMenuItem onClick={() => onDialog("score-enter")}>
            Enter score
          </DropdownMenuItem>
        )}
        {canConfirmDispute && (
          <>
            <DropdownMenuItem
              onClick={() => onInline(() => confirmScoreAction(m.matchId))}
            >
              Confirm score
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onInline(() => disputeScoreAction(m.matchId))}
            >
              Dispute score
            </DropdownMenuItem>
          </>
        )}
        {canEditScore && (
          <DropdownMenuItem onClick={() => onDialog("score-enter")}>
            Edit score
          </DropdownMenuItem>
        )}
        {canReenter && (
          <DropdownMenuItem onClick={() => onDialog("score-enter")}>
            Re-enter score
          </DropdownMenuItem>
        )}
        {canResolve && (
          <DropdownMenuItem onClick={() => onDialog("score-resolve")}>
            {m.status === "disputed" ? "Resolve score" : "Edit score (admin)"}
          </DropdownMenuItem>
        )}
        {canClear && (
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDialog("cancel")}
          >
            Clear date &amp; time
          </DropdownMenuItem>
        )}
        {canCancel && (
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDialog("cancel")}
          >
            Cancel match
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TimeDialog({
  match: m,
  mode,
  myTeamId,
  onClose,
}: {
  match: ScheduleMatch;
  mode: "time-set" | "time-counter";
  myTeamId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [when, setWhen] = useState("");
  const [loc, setLoc] = useState(m.location ?? "");
  const isSet = mode === "time-set";

  function submit() {
    if (!when) {
      toast.error("Pick a date and time.");
      return;
    }
    startTransition(async () => {
      const result = isSet
        ? await setFixtureTimeAction(m.matchId, myTeamId, when, loc)
        : await counterMatchAction(m.matchId, myTeamId, when, loc);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result?.message) toast.success(result.message);
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isSet ? "Set date & time" : "Counter with a new time"}
          </DialogTitle>
          <DialogDescription>vs {m.opponentName}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="match-when">Date &amp; time</Label>
            <Input
              id="match-when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="match-loc">Location</Label>
            <Input
              id="match-loc"
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={submit}>
            {pending ? "Saving…" : isSet ? "Save" : "Send counter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
