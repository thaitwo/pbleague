"use client";

import {
  Dialog,
  DialogContent,
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
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Edit division</DialogTitle>
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
