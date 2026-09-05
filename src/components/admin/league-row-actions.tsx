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
import { EditLeagueDialog } from "@/components/admin/edit-league-dialog";
import { CreateDivisionDialog } from "@/components/admin/create-division-dialog";
import { deleteLeagueAction } from "@/app/admin/actions";

type LeagueRowActionsProps = {
  league: {
    id: string;
    name: string;
    status: string;
    seasonStart: string;
    seasonEnd: string;
  };
};

export function LeagueRowActions({ league }: LeagueRowActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [addDivisionOpen, setAddDivisionOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="League actions">
              <MoreVertical className="text-muted-foreground" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-auto min-w-40">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setAddDivisionOpen(true)}>
            Add division
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditLeagueDialog
        leagueId={league.id}
        leagueName={league.name}
        initial={{
          name: league.name,
          status: league.status,
          seasonStart: league.seasonStart,
          seasonEnd: league.seasonEnd,
        }}
        open={editOpen}
        onOpenChange={setEditOpen}
        trigger={false}
      />

      <CreateDivisionDialog
        leagueId={league.id}
        open={addDivisionOpen}
        onOpenChange={setAddDivisionOpen}
        trigger={false}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent
          className="max-w-sm"
          overlayClassName="bg-black/30 backdrop-blur-md"
        >
          <DialogHeader>
            <DialogTitle>Delete “{league.name}”?</DialogTitle>
            <DialogDescription>
              This permanently removes the league and all of its divisions,
              teams, and matches. This can’t be undone.
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
                  const result = await deleteLeagueAction(league.id);
                  if (result?.error) {
                    toast.error(result.error);
                    return;
                  }
                  setDeleteOpen(false);
                  router.refresh();
                })
              }
            >
              {pending ? "Deleting…" : "Delete league"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
