"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditLeagueDialog } from "@/components/admin/edit-league-dialog";
import { CreateDivisionDialog } from "@/components/admin/create-division-dialog";

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
  const [editOpen, setEditOpen] = useState(false);
  const [addDivisionOpen, setAddDivisionOpen] = useState(false);

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
    </>
  );
}
