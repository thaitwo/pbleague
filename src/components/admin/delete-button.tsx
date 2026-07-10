"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type DeleteButtonProps = {
  action: () => Promise<void>;
  confirmMessage: string;
  label?: string;
  size?: "sm" | "default";
};

export function DeleteButton({
  action,
  confirmMessage,
  label = "Delete",
  size = "sm",
}: DeleteButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      size={size}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(async () => {
          try {
            await action();
            router.refresh();
          } catch {
            toast.error("Could not delete. Please try again.");
          }
        });
      }}
    >
      {pending ? "Deleting…" : label}
    </Button>
  );
}
