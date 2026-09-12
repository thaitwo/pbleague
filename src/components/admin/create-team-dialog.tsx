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
import { CreateTeamForm } from "@/components/admin/create-team-form";

export function CreateTeamDialog({
  divisionId,
  open: openProp,
  onOpenChange,
  trigger = true,
}: {
  divisionId: string;
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
      {trigger && <DialogTrigger render={<Button size="sm">Add team</Button>} />}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New team</DialogTitle>
        </DialogHeader>
        <CreateTeamForm divisionId={divisionId} onCreated={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
