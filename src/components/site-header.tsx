import { headers } from "next/headers";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/lib/auth";

export async function SiteHeader() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold tracking-tight">
            PBL
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/leagues" className="hover:text-foreground">
              Leagues
            </Link>
            {session && (
              <Link href="/dashboard" className="hover:text-foreground">
                Dashboard
              </Link>
            )}
            {session?.user.role === "admin" && (
              <Link href="/admin" className="hover:text-foreground">
                Admin
              </Link>
            )}
            {session && (
              <Link href="/profile" className="hover:text-foreground">
                Profile
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              {session.user.role === "admin" && <Badge variant="secondary">Admin</Badge>}
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {session.user.name}
              </span>
              <SignOutButton />
            </>
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
