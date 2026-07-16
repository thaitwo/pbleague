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
import { createTeamAction, type ActionState } from "@/app/admin/actions";
import { AREAS } from "@/lib/constants";

type CreateTeamFormProps = {
  leagueId: string;
  onCreated?: () => void;
};

export function CreateTeamForm({ leagueId, onCreated }: CreateTeamFormProps) {
  const action = createTeamAction.bind(null, leagueId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) {
      toast.success("Team created.");
      onCreated?.();
    }
  }, [state, onCreated]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="team-name">
          Team name <span className="text-destructive">*</span>
        </Label>
        <Input id="team-name" name="name" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Area</Label>
        <Select name="area">
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {AREAS.map((area) => (
              <SelectItem key={area} value={area}>
                {area}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="rosterCap">Roster cap</Label>
        <Input
          id="rosterCap"
          name="rosterCap"
          type="number"
          min={1}
          placeholder="—"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="captainEmail">Captain email</Label>
        <Input
          id="captainEmail"
          name="captainEmail"
          type="email"
          placeholder="captain@example.com"
        />
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
          {pending ? "Adding…" : "Add team"}
        </Button>
      </div>
    </form>
  );
}
