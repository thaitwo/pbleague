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

export function CreateTeamDialog({ leagueId }: { leagueId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Add team</Button>} />
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
