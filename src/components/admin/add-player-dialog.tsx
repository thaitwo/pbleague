"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addPlayerAction, type ActionState } from "@/app/admin/actions";

type AddPlayerDialogProps = {
  leagueId: string;
  teamId: string;
};

export function AddPlayerDialog({ leagueId, teamId }: AddPlayerDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Add player
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add player</DialogTitle>
          <DialogDescription>
            Add a player to the roster by email.
          </DialogDescription>
        </DialogHeader>
        <AddPlayerForm
          leagueId={leagueId}
          teamId={teamId}
          onAdded={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddPlayerForm({
  leagueId,
  teamId,
  onAdded,
}: AddPlayerDialogProps & { onAdded: () => void }) {
  const action = addPlayerAction.bind(null, leagueId, teamId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) {
      toast.success("Player added.");
      onAdded();
    }
  }, [state, onAdded]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="add-player-email">Player email</Label>
        <Input
          id="add-player-email"
          name="playerEmail"
          type="email"
          required
          placeholder="player@example.com"
        />
      </div>
      <DialogFooter>
        <DialogClose
          render={
            <Button type="button" variant="outline">
              Cancel
            </Button>
          }
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add player"}
        </Button>
      </DialogFooter>
    </form>
  );
}
