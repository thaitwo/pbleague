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
import {
  demoteCoCaptainAction,
  promoteCaptainAction,
  promoteCoCaptainAction,
  removeMemberAction,
  type RowActionResult,
} from "@/app/teams/actions";

type RosterRowActionsProps = {
  teamId: string;
  membershipId: string;
  memberName: string;
  role: "captain" | "co_captain" | "player";
  /** Captain or admin — can change who holds leadership roles. */
  canLead: boolean;
  /** Captain, co-captain, or admin — can remove members. */
  canManage: boolean;
  isSelf: boolean;
};

export function RosterRowActions({
  teamId,
  membershipId,
  memberName,
  role,
  canLead,
  canManage,
  isSelf,
}: RosterRowActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  function run(fn: () => Promise<RowActionResult>) {
    startTransition(async () => {
      const result = await fn();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result?.message) toast.success(result.message);
      setDeleteOpen(false);
      router.refresh();
    });
  }

  const canMakeCaptain = canLead && role !== "captain";
  const canMakeCoCaptain = canLead && role === "player";
  const canRemoveCoCaptain = canLead && role === "co_captain";
  const canRemove = canManage && role !== "captain" && !isSelf;

  if (!canMakeCaptain && !canMakeCoCaptain && !canRemoveCoCaptain && !canRemove) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Member actions">
              <MoreVertical className="text-muted-foreground" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-auto min-w-44">
          {canMakeCaptain && (
            <DropdownMenuItem
              onClick={() => run(() => promoteCaptainAction(teamId, membershipId))}
            >
              Make captain
            </DropdownMenuItem>
          )}
          {canMakeCoCaptain && (
            <DropdownMenuItem
              onClick={() =>
                run(() => promoteCoCaptainAction(teamId, membershipId))
              }
            >
              Make co-captain
            </DropdownMenuItem>
          )}
          {canRemoveCoCaptain && (
            <DropdownMenuItem
              onClick={() =>
                run(() => demoteCoCaptainAction(teamId, membershipId))
              }
            >
              Remove co-captain
            </DropdownMenuItem>
          )}
          {canRemove && (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              Remove from team
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent
          className="max-w-sm"
          overlayClassName="bg-black/30 backdrop-blur-md"
        >
          <DialogHeader>
            <DialogTitle>Remove {memberName}?</DialogTitle>
            <DialogDescription>
              They’ll be removed from this team’s roster.
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
              onClick={() => run(() => removeMemberAction(teamId, membershipId))}
            >
              {pending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
