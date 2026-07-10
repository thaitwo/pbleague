"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RowActionResult } from "@/app/teams/actions";

type Row = { my: string; opp: string };

type ScoreEntryFormProps = {
  myLabel: string;
  oppLabel: string;
  submitLabel: string;
  initialGames?: { myScore: number; oppScore: number }[];
  onSubmit: (
    games: { myScore: number; oppScore: number }[],
  ) => Promise<RowActionResult>;
  onClose?: () => void;
};

export function ScoreEntryForm({
  myLabel,
  oppLabel,
  submitLabel,
  initialGames,
  onSubmit,
  onClose,
}: ScoreEntryFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<Row[]>(
    initialGames && initialGames.length > 0
      ? initialGames.map((g) => ({
          my: String(g.myScore),
          opp: String(g.oppScore),
        }))
      : [{ my: "", opp: "" }],
  );

  function update(i: number, side: "my" | "opp", value: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [side]: value } : r)));
  }

  function submit() {
    const games: { myScore: number; oppScore: number }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const my = Number(rows[i].my);
      const opp = Number(rows[i].opp);
      if (
        rows[i].my === "" ||
        rows[i].opp === "" ||
        !Number.isInteger(my) ||
        !Number.isInteger(opp) ||
        my < 0 ||
        opp < 0
      ) {
        toast.error(`Enter both scores for game ${i + 1}.`);
        return;
      }
      if (my === opp) {
        toast.error(`Game ${i + 1} can't be a tie.`);
        return;
      }
      games.push({ myScore: my, oppScore: opp });
    }
    startTransition(async () => {
      const result = await onSubmit(games);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.message) toast.success(result.message);
      onClose?.();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="grid grid-cols-[1.5rem_1fr_1fr] items-center gap-2 text-xs text-muted-foreground">
        <span>#</span>
        <span>{myLabel}</span>
        <span>{oppLabel}</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-[1.5rem_1fr_1fr] items-center gap-2"
        >
          <span className="text-sm text-muted-foreground">{i + 1}</span>
          <Input
            type="number"
            min={0}
            max={99}
            value={r.my}
            onChange={(e) => update(i, "my", e.target.value)}
          />
          <Input
            type="number"
            min={0}
            max={99}
            value={r.opp}
            onChange={(e) => update(i, "opp", e.target.value)}
          />
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {rows.length < 7 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRows((rs) => [...rs, { my: "", opp: "" }])}
          >
            Add game
          </Button>
        )}
        {rows.length > 1 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRows((rs) => rs.slice(0, -1))}
          >
            Remove game
          </Button>
        )}
        <Button type="button" size="sm" disabled={pending} onClick={submit}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
