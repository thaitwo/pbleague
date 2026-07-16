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
import { updateTeamAction, type ActionState } from "@/app/admin/actions";
import { AREAS } from "@/lib/constants";

type EditTeamFormProps = {
  leagueId: string;
  team: {
    id: string;
    name: string;
    area: string | null;
    rosterCap: number | null;
  };
  onSaved: () => void;
};

export function EditTeamForm({ leagueId, team, onSaved }: EditTeamFormProps) {
  const action = updateTeamAction.bind(null, leagueId, team.id);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );
  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) {
      toast.success("Team updated.");
      onSaved();
    }
  }, [state, onSaved]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-team-name">Team name</Label>
        <Input
          id="edit-team-name"
          name="name"
          required
          defaultValue={team.name}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Area</Label>
        <Select name="area" defaultValue={team.area ?? undefined}>
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
        <Label htmlFor="edit-roster-cap">Roster cap (optional)</Label>
        <Input
          id="edit-roster-cap"
          name="rosterCap"
          type="number"
          min={1}
          defaultValue={team.rosterCap ?? ""}
          placeholder="—"
        />
      </div>
      <div className="flex justify-end gap-2">
        <DialogClose
          render={
            <Button type="button" variant="outline">
              Cancel
            </Button>
          }
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
