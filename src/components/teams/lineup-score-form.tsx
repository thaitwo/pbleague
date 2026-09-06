"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RowActionResult } from "@/app/teams/actions";
import type { MatchLineupView, RosterPlayer } from "@/db/queries";
import { lineupFormatLabel } from "@/lib/constants";

type LineupInput = {
  playersPerSide: number;
  homePlayerIds: string[];
  awayPlayerIds: string[];
  games: { homeScore: number; awayScore: number }[];
};

type LineupState = {
  playersPerSide: number;
  home: string[]; // userIds ("" = unset)
  away: string[];
  games: { home: string; away: string }[];
};

function initialState(
  template: { playersPerSide: number }[],
  existing: MatchLineupView[],
): LineupState[] {
  return template.map((slot, i) => {
    const ex = existing[i];
    return {
      playersPerSide: slot.playersPerSide,
      home: Array.from(
        { length: slot.playersPerSide },
        (_, j) => ex?.homePlayers[j]?.userId ?? "",
      ),
      away: Array.from(
        { length: slot.playersPerSide },
        (_, j) => ex?.awayPlayers[j]?.userId ?? "",
      ),
      games:
        ex && ex.games.length > 0
          ? ex.games.map((g) => ({
              home: String(g.homeScore),
              away: String(g.awayScore),
            }))
          : [{ home: "", away: "" }],
    };
  });
}

export function LineupScoreForm({
  myTeamId,
  mode,
  template,
  homeTeamName,
  awayTeamName,
  homeRoster,
  awayRoster,
  existing,
  onClose,
  onSubmit,
}: {
  myTeamId: string;
  mode: "enter" | "resolve";
  template: { playersPerSide: number }[];
  homeTeamName: string;
  awayTeamName: string;
  homeRoster: RosterPlayer[];
  awayRoster: RosterPlayer[];
  existing: MatchLineupView[];
  onClose: () => void;
  onSubmit: (lineups: LineupInput[]) => Promise<RowActionResult>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [lineups, setLineups] = useState<LineupState[]>(() =>
    initialState(template, existing),
  );

  void myTeamId; // used by the caller when binding onSubmit

  function setPlayer(li: number, side: "home" | "away", pi: number, v: string) {
    setLineups((ls) =>
      ls.map((l, i) =>
        i === li
          ? { ...l, [side]: l[side].map((x, j) => (j === pi ? v : x)) }
          : l,
      ),
    );
  }

  function setGame(li: number, gi: number, side: "home" | "away", v: string) {
    setLineups((ls) =>
      ls.map((l, i) =>
        i === li
          ? {
              ...l,
              games: l.games.map((g, j) =>
                j === gi ? { ...g, [side]: v } : g,
              ),
            }
          : l,
      ),
    );
  }

  function addGame(li: number) {
    setLineups((ls) =>
      ls.map((l, i) =>
        i === li && l.games.length < 3
          ? { ...l, games: [...l.games, { home: "", away: "" }] }
          : l,
      ),
    );
  }

  function removeGame(li: number) {
    setLineups((ls) =>
      ls.map((l, i) =>
        i === li && l.games.length > 1
          ? { ...l, games: l.games.slice(0, -1) }
          : l,
      ),
    );
  }

  function submit() {
    const payload: LineupInput[] = [];
    for (let i = 0; i < lineups.length; i++) {
      const l = lineups[i];
      const n = i + 1;
      if (l.home.some((x) => !x) || l.away.some((x) => !x)) {
        toast.error(`Lineup ${n}: pick all players.`);
        return;
      }
      const games: { homeScore: number; awayScore: number }[] = [];
      for (let g = 0; g < l.games.length; g++) {
        const home = Number(l.games[g].home);
        const away = Number(l.games[g].away);
        if (
          l.games[g].home === "" ||
          l.games[g].away === "" ||
          !Number.isInteger(home) ||
          !Number.isInteger(away) ||
          home < 0 ||
          away < 0
        ) {
          toast.error(`Lineup ${n} game ${g + 1}: enter both scores.`);
          return;
        }
        if (home === away) {
          toast.error(`Lineup ${n} game ${g + 1} can't be a tie.`);
          return;
        }
        games.push({ homeScore: home, awayScore: away });
      }
      const hw = games.filter((g) => g.homeScore > g.awayScore).length;
      if (hw === games.length - hw) {
        toast.error(`Lineup ${n} needs a winner.`);
        return;
      }
      payload.push({
        playersPerSide: l.playersPerSide,
        homePlayerIds: l.home,
        awayPlayerIds: l.away,
        games,
      });
    }
    startTransition(async () => {
      const result = await onSubmit(payload);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.message) toast.success(result.message);
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
      {lineups.map((l, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="text-sm font-medium">
            Lineup {i + 1}{" "}
            <span className="text-muted-foreground">
              · {lineupFormatLabel(l.playersPerSide)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <PlayerPickers
              label={homeTeamName}
              roster={homeRoster}
              selected={l.home}
              onChange={(pi, v) => setPlayer(i, "home", pi, v)}
            />
            <PlayerPickers
              label={awayTeamName}
              roster={awayRoster}
              selected={l.away}
              onChange={(pi, v) => setPlayer(i, "away", pi, v)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1.5rem_1fr_1fr] gap-2 text-xs text-muted-foreground">
              <span>#</span>
              <span className="truncate">{homeTeamName}</span>
              <span className="truncate">{awayTeamName}</span>
            </div>
            {l.games.map((g, gi) => (
              <div
                key={gi}
                className="grid grid-cols-[1.5rem_1fr_1fr] items-center gap-2"
              >
                <span className="text-sm text-muted-foreground">{gi + 1}</span>
                <Input
                  type="number"
                  min={0}
                  max={99}
                  value={g.home}
                  onChange={(e) => setGame(i, gi, "home", e.target.value)}
                />
                <Input
                  type="number"
                  min={0}
                  max={99}
                  value={g.away}
                  onChange={(e) => setGame(i, gi, "away", e.target.value)}
                />
              </div>
            ))}
            <div className="flex gap-2">
              {l.games.length < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addGame(i)}
                >
                  Add game
                </Button>
              )}
              {l.games.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeGame(i)}
                >
                  Remove game
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" disabled={pending} onClick={submit}>
          {pending
            ? "Saving…"
            : mode === "resolve"
              ? "Save final score"
              : "Save score"}
        </Button>
      </div>
    </div>
  );
}

function PlayerPickers({
  label,
  roster,
  selected,
  onChange,
}: {
  label: string;
  roster: RosterPlayer[];
  selected: string[];
  onChange: (index: number, userId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {selected.map((val, pi) => (
        <Select
          key={pi}
          value={val}
          onValueChange={(v) => onChange(pi, v ?? "")}
        >
          <SelectTrigger className="w-full" size="sm">
            <SelectValue placeholder="Select player" />
          </SelectTrigger>
          <SelectContent>
            {roster.length === 0 ? (
              <SelectItem value="" disabled>
                No players on roster
              </SelectItem>
            ) : (
              roster.map((p) => (
                <SelectItem key={p.userId} value={p.userId}>
                  {p.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
