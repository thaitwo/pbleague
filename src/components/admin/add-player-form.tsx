"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addPlayerAction, type ActionState } from "@/app/admin/actions";

type AddPlayerFormProps = {
  leagueId: string;
  teamId: string;
};

export function AddPlayerForm({ leagueId, teamId }: AddPlayerFormProps) {
  const action = addPlayerAction.bind(null, leagueId, teamId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) {
      toast.success("Player added.");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex items-end gap-2">
      <Input
        name="playerEmail"
        type="email"
        required
        placeholder="player@example.com"
        className="h-8"
      />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "…" : "Add player"}
      </Button>
    </form>
  );
}
