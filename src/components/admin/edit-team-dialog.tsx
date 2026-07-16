"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EditTeamForm } from "@/components/admin/edit-team-form";
import { AssignCaptainForm } from "@/components/admin/assign-captain-form";

type EditTeamDialogProps = {
  leagueId: string;
  team: {
    id: string;
    name: string;
    area: string | null;
    rosterCap: number | null;
    hasCaptain: boolean;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: boolean;
  triggerLabel?: string;
};

export function EditTeamDialog({
  leagueId,
  team,
  open: openProp,
  onOpenChange,
  trigger = true,
  triggerLabel = "Edit",
}: EditTeamDialogProps) {
  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;
  const setOpen = (o: boolean) => {
    if (!isControlled) setOpenState(o);
    onOpenChange?.(o);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger
          render={
            <Button variant="outline" size="sm">
              {triggerLabel}
            </Button>
          }
        />
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit team</DialogTitle>
          <DialogDescription>
            Update the team&apos;s details or manage its roster.
          </DialogDescription>
        </DialogHeader>
        <EditTeamForm
          leagueId={leagueId}
          team={team}
          onSaved={() => setOpen(false)}
        >
          <div className="flex flex-col gap-1.5 border-t pt-4">
            <span className="text-sm font-medium">Captain</span>
            <AssignCaptainForm
              leagueId={leagueId}
              teamId={team.id}
              hasCaptain={team.hasCaptain}
            />
          </div>
        </EditTeamForm>
      </DialogContent>
    </Dialog>
  );
}
