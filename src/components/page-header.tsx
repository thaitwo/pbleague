import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  titleExtra,
  description,
  action,
  backHref,
}: {
  title: string;
  titleExtra?: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  backHref?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          {backHref ? (
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Back"
              render={<Link href={backHref} />}
            >
              <ArrowLeft />
            </Button>
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {titleExtra ? (
            <div className="flex items-center gap-2">{titleExtra}</div>
          ) : null}
        </div>
        {description ? (
          <p className="text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
