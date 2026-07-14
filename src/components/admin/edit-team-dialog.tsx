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

type EditTeamDialogProps = {
  leagueId: string;
  team: {
    id: string;
    name: string;
    area: string | null;
    rosterCap: number | null;
  };
};

export function EditTeamDialog({ leagueId, team }: EditTeamDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Edit
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit team</DialogTitle>
          <DialogDescription>
            Update the team&apos;s name, area, or roster cap.
          </DialogDescription>
        </DialogHeader>
        <EditTeamForm
          leagueId={leagueId}
          team={team}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
