import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AcceptInviteButton } from "@/components/teams/accept-invite-button";
import { getTeamByInviteToken } from "@/db/queries";
import { getSession } from "@/lib/auth-guard";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getTeamByInviteToken(token);
  const session = await getSession();

  if (!result) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Invite not found</CardTitle>
            <CardDescription>
              This invite link is invalid or has been revoked. Ask a captain for
              a fresh one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" render={<Link href="/leagues" />}>
              Browse leagues
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { team, league } = result;

  if (!session) {
    // Send them to sign in, then back to this invite page.
    redirect(`/sign-in?redirect=/join/${token}`);
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Join {team.name}</CardTitle>
          <CardDescription>
            {league.name} · Level {league.skillLevel}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            You&apos;re signed in as {session.user.email}. Accepting adds you to
            this team&apos;s roster right away.
          </p>
          <AcceptInviteButton token={token} />
        </CardContent>
      </Card>
    </div>
  );
}
