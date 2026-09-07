"use client";

import { useActionState, useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionState } from "@/app/admin/actions";
import {
  AGE_GROUPS,
  DEFAULT_LINEUPS,
  GENDER_LABEL,
  GENDERS,
  MIN_LINEUPS,
  type Gender,
} from "@/lib/constants";

const RATING_TYPE_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "combo", label: "Combo" },
] as const;

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
};

function Req() {
  return <span className="text-destructive"> *</span>;
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
] as const;

export type DivisionFormInitial = {
  name: string;
  rating: string;
  ratingType: string;
  gender: string;
  ageGroup: string;
  lineups: { playersPerSide: number }[];
  status: string;
  seasonStart: string;
  seasonEnd: string;
};

const EMPTY: DivisionFormInitial = {
  name: "",
  rating: "",
  ratingType: "single",
  gender: "mixed",
  ageGroup: "18 & Over",
  lineups: DEFAULT_LINEUPS,
  status: "draft",
  seasonStart: "",
  seasonEnd: "",
};

export function DivisionForm({
  action,
  initial = EMPTY,
  submitLabel,
  pendingLabel,
  successMessage,
  onSaved,
  deleteSlot,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: DivisionFormInitial;
  submitLabel: string;
  pendingLabel: string;
  successMessage: string;
  onSaved: () => void;
  deleteSlot?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );
  const [lineups, setLineups] = useState<{ playersPerSide: number }[]>(
    initial.lineups,
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) {
      toast.success(successMessage);
      onSaved();
    }
  }, [state, onSaved, successMessage]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Left: division details */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="division-name">Name</Label>
            <Input
              id="division-name"
              name="name"
              defaultValue={initial.name}
              placeholder="Auto-named from the facets"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>
                Rating type
                <Req />
              </Label>
              <Select name="ratingType" defaultValue={initial.ratingType}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v) => (v === "combo" ? "Combo" : "Single")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {RATING_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="division-rating">
                Rating
                <Req />
              </Label>
              <Input
                id="division-rating"
                name="rating"
                required
                defaultValue={initial.rating}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>
                Gender
                <Req />
              </Label>
              <Select name="gender" defaultValue={initial.gender}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v) => GENDER_LABEL[v as Gender]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {GENDER_LABEL[g]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>
                Age group
                <Req />
              </Label>
              <Select name="ageGroup" defaultValue={initial.ageGroup}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGE_GROUPS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="division-start">Season start</Label>
              <Input
                id="division-start"
                name="seasonStart"
                type="date"
                defaultValue={initial.seasonStart}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="division-end">Season end</Label>
              <Input
                id="division-end"
                name="seasonEnd"
                type="date"
                defaultValue={initial.seasonEnd}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>
              Status
              <Req />
            </Label>
            <Select name="status" defaultValue={initial.status}>
              <SelectTrigger className="w-full">
                <SelectValue>{(v) => STATUS_LABELS[v] ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right: lineups */}
        <div className="flex flex-col gap-2 sm:border-l sm:pl-6">
          <Label>
            Lineups
            <Req />
          </Label>
          <p className="text-xs text-muted-foreground">
            Each team match is played as these lineups, in order.
          </p>
          <input type="hidden" name="lineups" value={JSON.stringify(lineups)} />
          <div className="flex flex-col gap-2">
            {lineups.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-16 text-sm text-muted-foreground">
                  Lineup {i + 1}
                </span>
                <Select
                  value={String(l.playersPerSide)}
                  onValueChange={(v) =>
                    setLineups((ls) =>
                      ls.map((x, idx) =>
                        idx === i ? { playersPerSide: Number(v) } : x,
                      ),
                    )
                  }
                >
                  <SelectTrigger className="flex-1" size="sm">
                    <SelectValue>
                      {(v) => (v === "1" ? "Singles" : "Doubles")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">Doubles</SelectItem>
                    <SelectItem value="1">Singles</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove lineup ${i + 1}`}
                  disabled={lineups.length <= MIN_LINEUPS}
                  onClick={() =>
                    setLineups((ls) => ls.filter((_, idx) => idx !== i))
                  }
                >
                  <X className="text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setLineups((ls) => [...ls, { playersPerSide: 2 }])}
          >
            Add lineup
          </Button>
        </div>
      </div>

      <div className="-mx-4 -mb-4 flex items-center gap-2 rounded-b-xl border-t bg-muted/50 p-4">
        {deleteSlot}
        <div className="ml-auto flex gap-2">
          <DialogClose
            render={
              <Button type="button" variant="outline">
                Cancel
              </Button>
            }
          />
          <Button type="submit" disabled={pending}>
            {pending ? pendingLabel : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
