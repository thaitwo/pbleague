"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assignCaptainAction, type ActionState } from "@/app/admin/actions";

type AssignCaptainFormProps = {
  leagueId: string;
  teamId: string;
  hasCaptain: boolean;
};

export function AssignCaptainForm({
  leagueId,
  teamId,
  hasCaptain,
}: AssignCaptainFormProps) {
  const action = assignCaptainAction.bind(null, leagueId, teamId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) {
      toast.success("Captain assigned.");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex items-end gap-2">
      <Input
        name="captainEmail"
        type="email"
        required
        placeholder="captain@example.com"
        className="h-8"
      />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "…" : hasCaptain ? "Replace captain" : "Set captain"}
      </Button>
    </form>
  );
}
