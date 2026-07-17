"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { regenerateInviteAction } from "@/app/teams/actions";

export function InvitePanel({
  teamId,
  initialToken,
  origin,
}: {
  teamId: string;
  initialToken: string | null;
  origin: string;
}) {
  const [token, setToken] = useState(initialToken);
  const [pending, startTransition] = useTransition();

  const link = token ? `${origin}/join/${token}` : "";

  function regenerate() {
    startTransition(async () => {
      const result = await regenerateInviteAction(teamId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setToken(result.token ?? null);
      toast.success(token ? "New link generated — the old one no longer works." : "Invite link created.");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Anyone with this link who signs in joins the team instantly — no
        approval needed.
      </p>
      {token ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input readOnly value={link} className="font-mono text-xs" />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(link);
                toast.success("Copied to clipboard.");
              }}
            >
              Copy
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={regenerate}
            >
              {pending ? "…" : "Regenerate"}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={pending}
          onClick={regenerate}
        >
          {pending ? "Creating…" : "Create invite link"}
        </Button>
      )}
    </div>
  );
}
