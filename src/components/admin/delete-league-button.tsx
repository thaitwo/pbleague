"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteLeagueAction } from "@/app/admin/actions";

export function DeleteLeagueButton({
  leagueId,
  leagueName,
  onOpenChange,
}: {
  leagueId: string;
  leagueName: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        onOpenChange?.(o);
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Delete league"
          >
            <Trash2 className="text-destructive" />
          </Button>
        }
      />
      <DialogContent
        className="max-w-sm"
        overlayClassName="bg-black/30 backdrop-blur-md"
      >
        <DialogHeader>
          <DialogTitle>Delete “{leagueName}”?</DialogTitle>
          <DialogDescription>
            Deleting removes the league and its teams.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                // Redirects to /admin on success; only returns on error.
                const result = await deleteLeagueAction(leagueId);
                if (result?.error) toast.error(result.error);
              })
            }
          >
            {pending ? "Deleting…" : "Delete league"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
