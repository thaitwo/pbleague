"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DivisionForm,
  type DivisionFormInitial,
} from "@/components/admin/division-form";
import { updateDivisionAction } from "@/app/admin/actions";

export type { DivisionFormInitial as DivisionFormValues };

export function EditDivisionDialog({
  divisionId,
  leagueId,
  initial,
  open,
  onOpenChange,
}: {
  divisionId: string;
  leagueId: string;
  initial: DivisionFormInitial;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit division</DialogTitle>
          <DialogDescription>
            Update the division’s facets, dates, or status.
          </DialogDescription>
        </DialogHeader>
        <DivisionForm
          action={updateDivisionAction.bind(null, divisionId, leagueId)}
          initial={initial}
          submitLabel="Save changes"
          pendingLabel="Saving…"
          successMessage="Division updated."
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
