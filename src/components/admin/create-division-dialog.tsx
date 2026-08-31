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
import { DivisionForm } from "@/components/admin/division-form";
import { createDivisionAction } from "@/app/admin/actions";

export function CreateDivisionDialog({
  leagueId,
  open: openProp,
  onOpenChange,
  trigger = true,
}: {
  leagueId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: boolean;
}) {
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
        <DialogTrigger render={<Button size="sm">Add division</Button>} />
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New division</DialogTitle>
          <DialogDescription>
            A rating flight — teams register into it and play a round-robin.
          </DialogDescription>
        </DialogHeader>
        <DivisionForm
          action={createDivisionAction.bind(null, leagueId)}
          submitLabel="Create division"
          pendingLabel="Creating…"
          successMessage="Division created."
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
