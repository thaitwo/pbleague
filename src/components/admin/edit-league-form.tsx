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
import { updateLeagueAction, type ActionState } from "@/app/admin/actions";
import { SKILL_LEVELS } from "@/lib/constants";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
] as const;

type EditLeagueFormProps = {
  leagueId: string;
  initial: {
    name: string;
    skillLevel: string;
    status: string;
    seasonStart: string;
    seasonEnd: string;
  };
  onSaved?: () => void;
  onCancel?: () => void;
  deleteSlot?: React.ReactNode;
};

export function EditLeagueForm({
  leagueId,
  initial,
  onSaved,
  onCancel,
  deleteSlot,
}: EditLeagueFormProps) {
  const action = updateLeagueAction.bind(null, leagueId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) {
      toast.success("League updated.");
      onSaved?.();
    }
  }, [state, onSaved]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">League name</Label>
          <Input id="name" name="name" required defaultValue={initial.name} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Skill level</Label>
          <Select name="skillLevel" defaultValue={initial.skillLevel}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a level" />
            </SelectTrigger>
            <SelectContent>
              {SKILL_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="seasonStart">Season start</Label>
          <Input
            id="seasonStart"
            name="seasonStart"
            type="date"
            defaultValue={initial.seasonStart}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="seasonEnd">Season end</Label>
          <Input
            id="seasonEnd"
            name="seasonEnd"
            type="date"
            defaultValue={initial.seasonEnd}
          />
        </div>
      </div>
      <div className="-mx-4 -mb-4 flex items-center gap-2 rounded-b-xl border-t bg-muted/50 p-4">
        {deleteSlot}
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
