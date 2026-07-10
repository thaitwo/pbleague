"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { RowActionResult } from "@/app/teams/actions";

type ActionButtonProps = {
  action: () => Promise<RowActionResult | void>;
  label: string;
  pendingLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: "sm" | "default";
  confirm?: string;
  className?: string;
};

export function ActionButton({
  action,
  label,
  pendingLabel = "Working…",
  variant = "default",
  size = "sm",
  confirm,
  className,
}: ActionButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        startTransition(async () => {
          const result = await action();
          if (result?.error) {
            toast.error(result.error);
            return;
          }
          if (result?.message) toast.success(result.message);
          router.refresh();
        });
      }}
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}
