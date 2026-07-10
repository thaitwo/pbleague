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
import { createLeagueAction, type ActionState } from "@/app/admin/actions";
import { SKILL_LEVELS } from "@/lib/constants";

export function CreateLeagueForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createLeagueAction,
    {},
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">League name</Label>
          <Input id="name" name="name" required placeholder="Spring Ladder" />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Skill level</Label>
          <Select name="skillLevel" defaultValue={SKILL_LEVELS[1]}>
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
          <Label htmlFor="seasonStart">Season start (optional)</Label>
          <Input id="seasonStart" name="seasonStart" type="date" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="seasonEnd">Season end (optional)</Label>
          <Input id="seasonEnd" name="seasonEnd" type="date" />
        </div>
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creating…" : "Create league"}
      </Button>
    </form>
  );
}
