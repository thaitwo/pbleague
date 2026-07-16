"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditTeamDialog } from "@/components/admin/edit-team-dialog";

type TeamRowActionsProps = {
  leagueId: string;
  team: {
    id: string;
    name: string;
    area: string | null;
    rosterCap: number | null;
    hasCaptain: boolean;
  };
  deleteAction: () => Promise<void>;
};

export function TeamRowActions({
  leagueId,
  team,
  deleteAction,
}: TeamRowActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Team actions">
              <MoreVertical className="text-muted-foreground" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditTeamDialog
        leagueId={leagueId}
        team={team}
        open={editOpen}
        onOpenChange={setEditOpen}
        trigger={false}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent
          className="max-w-sm"
          overlayClassName="bg-black/30 backdrop-blur-md"
        >
          <DialogHeader>
            <DialogTitle>Delete “{team.name}”?</DialogTitle>
            <DialogDescription>
              Deleting removes the team and its roster.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await deleteAction();
                    setDeleteOpen(false);
                    router.refresh();
                  } catch {
                    toast.error("Could not delete. Please try again.");
                  }
                })
              }
            >
              {pending ? "Deleting…" : "Delete team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
