"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { proposeMatchAction } from "@/app/teams/actions";

type ProposeMatchFormProps = {
  teamId: string;
  opponents: { id: string; name: string }[];
};

export function ProposeMatchForm({ teamId, opponents }: ProposeMatchFormProps) {
  const router = useRouter();
  const [opponent, setOpponent] = useState("");
  const [when, setWhen] = useState("");
  const [location, setLocation] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!opponent) {
      toast.error("Pick an opponent.");
      return;
    }
    if (!when) {
      toast.error("Pick a date and time.");
      return;
    }
    startTransition(async () => {
      const result = await proposeMatchAction(teamId, opponent, when, location);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Proposal sent.");
      setOpponent("");
      setWhen("");
      setLocation("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 sm:flex-row sm:items-end"
    >
      <div className="flex flex-1 flex-col gap-2">
        <Label>Opponent</Label>
        <Select value={opponent} onValueChange={(v) => setOpponent(v ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a team" />
          </SelectTrigger>
          <SelectContent>
            {opponents.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="when">Date & time</Label>
        <Input
          id="when"
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="location">Location (optional)</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Court 3, City Park"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Proposing…" : "Propose match"}
      </Button>
    </form>
  );
}
