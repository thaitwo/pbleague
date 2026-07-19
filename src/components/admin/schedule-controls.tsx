"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  clearScheduleAction,
  generateScheduleAction,
} from "@/app/admin/actions";

const MEETINGS = ["1", "2", "3", "4"] as const;

export function ScheduleControls({
  leagueId,
  hasFixtures,
  canGenerate,
}: {
  leagueId: string;
  hasFixtures: boolean;
  canGenerate: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [meetings, setMeetings] = useState("1");

  function generate() {
    startTransition(async () => {
      const result = await generateScheduleAction(leagueId, Number(meetings));
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Schedule created.");
      setGenerateOpen(false);
      router.refresh();
    });
  }

  function clear() {
    startTransition(async () => {
      const result = await clearScheduleAction(leagueId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Schedule cleared.");
      setClearOpen(false);
      router.refresh();
    });
  }

  if (hasFixtures) {
    return (
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogTrigger
          render={
            <Button variant="outline" size="sm">
              Clear schedule
            </Button>
          }
        />
        <DialogContent
          className="max-w-sm"
          overlayClassName="bg-black/30 backdrop-blur-md"
        >
          <DialogHeader>
            <DialogTitle>Clear the schedule?</DialogTitle>
            <DialogDescription>
              This removes all fixtures that don’t yet have a score. Matches with
              recorded scores are kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={clear}
            >
              {pending ? "Clearing…" : "Clear schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
      <DialogTrigger
        render={
          <Button size="sm" disabled={!canGenerate}>
            Generate schedule
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate schedule</DialogTitle>
          <DialogDescription>
            Creates a match for every pair of teams. Home captains set the date
            &amp; time for their home matches.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label>Times each pair of teams plays</Label>
          <Select value={meetings} onValueChange={(v) => setMeetings(v ?? "1")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEETINGS.map((n) => (
                <SelectItem key={n} value={n}>
                  {n === "1" ? "Once (single round-robin)" : `${n} times`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="outline">
                Cancel
              </Button>
            }
          />
          <Button type="button" disabled={pending} onClick={generate}>
            {pending ? "Generating…" : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
