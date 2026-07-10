"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "@/app/teams/actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          // On success this redirects to the team page; only errors return.
          const result = await acceptInviteAction(token);
          if (result?.error) toast.error(result.error);
        })
      }
    >
      {pending ? "Joining…" : "Accept & join team"}
    </Button>
  );
}
