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
import { EditDivisionDialog } from "@/components/admin/edit-division-dialog";
import type { DivisionFormInitial } from "@/components/admin/division-form";
import { deleteDivisionAction } from "@/app/admin/actions";

export function DivisionRowActions({
  leagueId,
  divisionId,
  divisionLabel,
  initial,
}: {
  leagueId: string;
  divisionId: string;
  divisionLabel: string;
  initial: DivisionFormInitial;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Division actions">
              <MoreVertical className="text-muted-foreground" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-auto min-w-40">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            Edit division
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditDivisionDialog
        divisionId={divisionId}
        leagueId={leagueId}
        initial={initial}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent
          className="max-w-sm"
          overlayClassName="bg-black/30 backdrop-blur-md"
        >
          <DialogHeader>
            <DialogTitle>Delete “{divisionLabel}”?</DialogTitle>
            <DialogDescription>
              Deleting removes the division and all its teams and matches.
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
                  const result = await deleteDivisionAction(
                    divisionId,
                    leagueId,
                  );
                  if (result?.error) {
                    toast.error(result.error);
                    return;
                  }
                  setDeleteOpen(false);
                  router.refresh();
                })
              }
            >
              {pending ? "Deleting…" : "Delete division"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
