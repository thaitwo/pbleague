"use client";

import { useActionState, useEffect } from "react";
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
import type { ActionState } from "@/app/admin/actions";
import { AGE_GROUPS, GENDER_LABEL, GENDERS, SKILL_LEVELS } from "@/lib/constants";

const RATING_TYPE_OPTIONS = [
  { value: "single", label: "Single skill level" },
  { value: "combo", label: "Combo (sum of two)" },
] as const;

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

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) {
      toast.success(successMessage);
      onSaved();
    }
  }, [state, onSaved, successMessage]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label>Rating type</Label>
          <Select name="ratingType" defaultValue={initial.ratingType}>
            <SelectTrigger className="w-full">
              <SelectValue />
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
          <Label htmlFor="division-rating">Rating</Label>
          <Input
            id="division-rating"
            name="rating"
            required
            list="skill-levels"
            defaultValue={initial.rating}
            placeholder="3.5 or 8.5"
          />
          <datalist id="skill-levels">
            {SKILL_LEVELS.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label>Gender</Label>
          <Select name="gender" defaultValue={initial.gender}>
            <SelectTrigger className="w-full">
              <SelectValue />
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
          <Label>Age group</Label>
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="division-name">Name override (optional)</Label>
        <Input
          id="division-name"
          name="name"
          defaultValue={initial.name}
          placeholder="Auto-named from the facets above"
        />
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
        <Label>Status</Label>
        <Select name="status" defaultValue={initial.status}>
          <SelectTrigger className="w-full">
            <SelectValue />
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
      <div className="-mx-4 -mb-4 flex items-center gap-2 rounded-b-xl border-t bg-muted/50 p-4">
        {deleteSlot}
        <Button type="submit" className="ml-auto" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
