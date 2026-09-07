"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
    status: string;
    seasonStart: string;
    seasonEnd: string;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: boolean;
};

export function EditLeagueDialog({
  leagueId,
  leagueName,
  initial,
  open: openProp,
  onOpenChange,
  trigger = true,
}: EditLeagueDialogProps) {
  const [openState, setOpenState] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
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
              Edit league
            </Button>
          }
        />
      )}
      <DialogContent
        className={
          confirmingDelete
            ? "pointer-events-none blur-sm transition-[filter]"
            : "transition-[filter]"
        }
      >
        <DialogHeader>
          <DialogTitle>League settings</DialogTitle>
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
