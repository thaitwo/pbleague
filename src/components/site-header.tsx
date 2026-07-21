import { Suspense } from "react";
import { headers } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MainNav, type NavItem } from "@/components/main-nav";
import { UserMenu } from "@/components/user-menu";
import { auth } from "@/lib/auth";

export async function SiteHeader() {
  const session = await auth.api.getSession({ headers: await headers() });

  const navItems: NavItem[] = [{ href: "/leagues", label: "Leagues" }];
  if (session) navItems.push({ href: "/dashboard", label: "Dashboard" });
  if (session?.user.role === "admin") {
    navItems.push({ href: "/admin", label: "Admin" });
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold tracking-tight">
            PBL
          </Link>
          <Suspense
            fallback={
              <nav className="flex items-center gap-1 text-sm text-muted-foreground">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md px-2.5 py-1.5 hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            }
          >
            <MainNav items={navItems} />
          </Suspense>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <UserMenu name={session.user.name} email={session.user.email} />
          ) : (
            <>
              <Button variant="ghost" size="sm" render={<Link href="/sign-in" />}>
                Sign in
              </Button>
              <Button size="sm" render={<Link href="/sign-up" />}>
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
