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
import { CreateTeamForm } from "@/components/admin/create-team-form";

export function CreateTeamDialog({
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
      {trigger && <DialogTrigger render={<Button size="sm">Add team</Button>} />}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New team</DialogTitle>
          <DialogDescription>
            Optionally set a captain by email — they&apos;ll be linked
            automatically when they sign up.
          </DialogDescription>
        </DialogHeader>
        <CreateTeamForm leagueId={leagueId} onCreated={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
