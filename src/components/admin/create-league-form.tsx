"use client";

import { useActionState, useEffect } from "react";
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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">
            League name <span className="text-destructive">*</span>
          </Label>
          <Input id="name" name="name" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Skill level</Label>
          <Select name="skillLevel">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select..." />
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
          <Label htmlFor="seasonStart">Start date</Label>
          <Input
            id="seasonStart"
            name="seasonStart"
            type="date"
            className="[&::-webkit-datetime-edit]:text-muted-foreground"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="seasonEnd">End date</Label>
          <Input
            id="seasonEnd"
            name="seasonEnd"
            type="date"
            className="[&::-webkit-datetime-edit]:text-muted-foreground"
          />
        </div>
      </div>
      <div className="-mx-4 -mb-4 flex justify-end gap-2 rounded-b-xl border-t bg-muted/50 p-4">
        <DialogClose
          render={
            <Button type="button" variant="outline">
              Cancel
            </Button>
          }
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create league"}
        </Button>
      </div>
    </form>
  );
}
