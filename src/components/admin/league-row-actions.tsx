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
import { CreateTeamDialog } from "@/components/admin/create-team-dialog";

type LeagueRowActionsProps = {
  league: {
    id: string;
    name: string;
    skillLevel: string;
    status: string;
    seasonStart: string;
    seasonEnd: string;
  };
};

export function LeagueRowActions({ league }: LeagueRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [addTeamOpen, setAddTeamOpen] = useState(false);

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
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setAddTeamOpen(true)}>
            Add team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditLeagueDialog
        leagueId={league.id}
        leagueName={league.name}
        initial={{
          name: league.name,
          skillLevel: league.skillLevel,
          status: league.status,
          seasonStart: league.seasonStart,
          seasonEnd: league.seasonEnd,
        }}
        open={editOpen}
        onOpenChange={setEditOpen}
        trigger={false}
      />

      <CreateTeamDialog
        leagueId={league.id}
        open={addTeamOpen}
        onOpenChange={setAddTeamOpen}
        trigger={false}
      />
    </>
  );
}
