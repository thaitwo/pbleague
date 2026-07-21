"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string };

export function MainNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isUnder = (prefix: string) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`);

  // Team pages live outside the section paths — highlight the section the
  // visitor came from (admin via ?from=admin, otherwise Leagues).
  const onTeamPage = isUnder("/teams");
  const teamSection =
    searchParams.get("from") === "admin" ? "/admin" : "/leagues";

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {items.map((item) => {
        const active =
          isUnder(item.href) || (onTeamPage && item.href === teamSection);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1.5 hover:text-foreground",
              active && "bg-muted font-medium text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
