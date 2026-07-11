"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateLeagueForm } from "@/components/admin/create-league-form";

export function CreateLeagueDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm">Create league</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New league</DialogTitle>
          <DialogDescription>
            Each league is a single skill level and season.
          </DialogDescription>
        </DialogHeader>
        <CreateLeagueForm />
      </DialogContent>
    </Dialog>
  );
}
