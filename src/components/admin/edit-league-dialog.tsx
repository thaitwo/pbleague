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
import { DeleteLeagueButton } from "@/components/admin/delete-league-button";
import { EditLeagueForm } from "@/components/admin/edit-league-form";

type EditLeagueDialogProps = {
  leagueId: string;
  leagueName: string;
  initial: {
    name: string;
    skillLevel: string;
    status: string;
    seasonStart: string;
    seasonEnd: string;
  };
};

export function EditLeagueDialog({
  leagueId,
  leagueName,
  initial,
}: EditLeagueDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Edit
          </Button>
        }
      />
      <DialogContent
        className={
          confirmingDelete
            ? "pointer-events-none blur-sm transition-[filter]"
            : "transition-[filter]"
        }
      >
        <DialogHeader>
          <DialogTitle>League settings</DialogTitle>
          <DialogDescription>
            Update the name, level, season dates, or status.
          </DialogDescription>
        </DialogHeader>
        <EditLeagueForm
          leagueId={leagueId}
          initial={initial}
          onSaved={() => setOpen(false)}
          onCancel={() => setOpen(false)}
          deleteSlot={
            <DeleteLeagueButton
              leagueId={leagueId}
              leagueName={leagueName}
              onOpenChange={setConfirmingDelete}
            />
          }
        />
      </DialogContent>
    </Dialog>
  );
}
