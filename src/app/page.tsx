import { headers } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="flex flex-col items-center gap-12 py-16 text-center">
      <div className="flex max-w-2xl flex-col items-center gap-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Your pickleball league, organized.
        </h1>
        <p className="text-lg text-muted-foreground">
          Join teams at your skill level, schedule matches with other captains,
          and track standings all season long.
        </p>
        <div className="mt-2 flex gap-3">
          {session ? (
            <Button size="lg" render={<Link href="/dashboard" />}>
              Go to dashboard
            </Button>
          ) : (
            <>
              <Button size="lg" render={<Link href="/sign-up" />}>
                Create an account
              </Button>
              <Button size="lg" variant="outline" render={<Link href="/sign-in" />}>
                Sign in
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Leagues by level</CardTitle>
            <CardDescription>
              Play in leagues matched to your skill rating, from 2.5 to 5.0.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Team scheduling</CardTitle>
            <CardDescription>
              Captains propose match times and locations; opponents confirm.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Live standings</CardTitle>
            <CardDescription>
              Scores recorded by captains roll straight into league standings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
