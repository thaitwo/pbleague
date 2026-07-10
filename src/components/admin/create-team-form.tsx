"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTeamAction, type ActionState } from "@/app/admin/actions";

export function CreateTeamForm({ leagueId }: { leagueId: string }) {
  const action = createTeamAction.bind(null, leagueId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) {
      toast.success("Team created.");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4 sm:flex-row sm:items-end"
    >
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="team-name">Team name</Label>
        <Input id="team-name" name="name" required placeholder="Dinkers" />
      </div>
      <div className="flex flex-col gap-2 sm:w-28">
        <Label htmlFor="rosterCap">Roster cap</Label>
        <Input
          id="rosterCap"
          name="rosterCap"
          type="number"
          min={1}
          placeholder="—"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="captainEmail">Captain email (optional)</Label>
        <Input
          id="captainEmail"
          name="captainEmail"
          type="email"
          placeholder="captain@example.com"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add team"}
      </Button>
    </form>
  );
}
