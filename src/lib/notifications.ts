import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { getMatch } from "@/db/queries";
import { teamMemberships, teams, user } from "@/db/schema";
import { sendEmail } from "./email";
import { formatDateTime } from "./format";
import { getBaseUrl } from "./url";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function layout(bodyHtml: string, url: string, cta: string) {
  return `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5">
${bodyHtml}
<p><a href="${url}" style="display:inline-block;padding:8px 14px;background:#111;color:#fff;border-radius:8px;text-decoration:none">${esc(cta)}</a></p>
<p style="color:#888;font-size:12px">PB League</p>
</div>`;
}

async function teamName(teamId: string) {
  const [t] = await db
    .select({ name: teams.name })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  return t?.name ?? "a team";
}

/** Emails of active captains/co-captains of a team (incl. not-yet-claimed invites). */
async function teamManagerEmails(teamId: string): Promise<string[]> {
  const rows = await db
    .select({
      email: user.email,
      invited: teamMemberships.invitedEmail,
    })
    .from(teamMemberships)
    .leftJoin(user, eq(teamMemberships.userId, user.id))
    .where(
      and(
        eq(teamMemberships.teamId, teamId),
        eq(teamMemberships.status, "active"),
        inArray(teamMemberships.role, ["captain", "co_captain"]),
      ),
    );
  return rows
    .map((r) => r.email ?? r.invited)
    .filter((e): e is string => Boolean(e));
}

async function adminEmails(): Promise<string[]> {
  const rows = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.role, "admin"));
  return rows.map((r) => r.email);
}

// ---------- triggers ----------

export async function notifyJoinRequested(teamId: string, requesterName: string) {
  const [to, name, base] = await Promise.all([
    teamManagerEmails(teamId),
    teamName(teamId),
    getBaseUrl(),
  ]);
  const url = `${base}/teams/${teamId}`;
  await sendEmail({
    to,
    subject: `${requesterName} wants to join ${name}`,
    text: `${requesterName} requested to join ${name}. Review it: ${url}`,
    html: layout(
      `<p><strong>${esc(requesterName)}</strong> requested to join <strong>${esc(name)}</strong>.</p>`,
      url,
      "Review request",
    ),
  });
}

export async function notifyRequestApproved(teamId: string, membershipId: string) {
  const [row] = await db
    .select({ email: user.email })
    .from(teamMemberships)
    .innerJoin(user, eq(teamMemberships.userId, user.id))
    .where(eq(teamMemberships.id, membershipId))
    .limit(1);
  if (!row?.email) return;
  const [name, base] = await Promise.all([teamName(teamId), getBaseUrl()]);
  const url = `${base}/teams/${teamId}`;
  await sendEmail({
    to: row.email,
    subject: `You're on ${name}`,
    text: `Your request to join ${name} was approved. View the team: ${url}`,
    html: layout(
      `<p>Your request to join <strong>${esc(name)}</strong> was approved. Welcome to the team!</p>`,
      url,
      "View team",
    ),
  });
}

export async function notifyMatchProposed(matchId: string) {
  const match = await getMatch(matchId);
  if (!match) return;
  const opponentTeamId = match.awayTeamId; // proposer is always home
  const [to, proposerName, base] = await Promise.all([
    teamManagerEmails(opponentTeamId),
    teamName(match.homeTeamId),
    getBaseUrl(),
  ]);
  const url = `${base}/teams/${opponentTeamId}`;
  const when = formatDateTime(match.scheduledAt);
  await sendEmail({
    to,
    subject: `${proposerName} proposed a match`,
    text: `${proposerName} proposed a match for ${when}. Accept or counter: ${url}`,
    html: layout(
      `<p><strong>${esc(proposerName)}</strong> proposed a match for <strong>${esc(when)}</strong>${match.location ? ` at ${esc(match.location)}` : ""}.</p>`,
      url,
      "Accept or counter",
    ),
  });
}

export async function notifyMatchAccepted(matchId: string) {
  const match = await getMatch(matchId);
  if (!match || !match.proposedByTeamId) return;
  const proposerTeamId = match.proposedByTeamId;
  const accepterTeamId =
    proposerTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
  const [to, accepterName, base] = await Promise.all([
    teamManagerEmails(proposerTeamId),
    teamName(accepterTeamId),
    getBaseUrl(),
  ]);
  const url = `${base}/teams/${proposerTeamId}`;
  const when = formatDateTime(match.scheduledAt);
  await sendEmail({
    to,
    subject: `${accepterName} accepted your match`,
    text: `${accepterName} accepted your match for ${when}. Details: ${url}`,
    html: layout(
      `<p><strong>${esc(accepterName)}</strong> accepted your match for <strong>${esc(when)}</strong>. It's on the schedule.</p>`,
      url,
      "View schedule",
    ),
  });
}

export async function notifyScoreEntered(matchId: string) {
  const match = await getMatch(matchId);
  if (!match || !match.scoreEnteredByTeamId) return;
  const confirmerTeamId =
    match.scoreEnteredByTeamId === match.homeTeamId
      ? match.awayTeamId
      : match.homeTeamId;
  const [to, enteredByName, base] = await Promise.all([
    teamManagerEmails(confirmerTeamId),
    teamName(match.scoreEnteredByTeamId),
    getBaseUrl(),
  ]);
  const url = `${base}/teams/${confirmerTeamId}`;
  await sendEmail({
    to,
    subject: `Confirm the score vs ${enteredByName}`,
    text: `${enteredByName} recorded a score for your match. Confirm or dispute it (auto-confirms in 72h): ${url}`,
    html: layout(
      `<p><strong>${esc(enteredByName)}</strong> recorded a score for your match. Please confirm or dispute it — it auto-confirms in 72 hours.</p>`,
      url,
      "Review score",
    ),
  });
}

export async function notifyScoreDisputed(matchId: string) {
  const match = await getMatch(matchId);
  if (!match || !match.scoreEnteredByTeamId) return;
  const entererTeamId = match.scoreEnteredByTeamId;
  const disputerTeamId =
    entererTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
  const [managers, admins, disputerName, base] = await Promise.all([
    teamManagerEmails(entererTeamId),
    adminEmails(),
    teamName(disputerTeamId),
    getBaseUrl(),
  ]);
  const url = `${base}/teams/${entererTeamId}`;
  await sendEmail({
    to: [...new Set([...managers, ...admins])],
    subject: `Score disputed by ${disputerName}`,
    text: `${disputerName} disputed the score you recorded. An admin can resolve it: ${url}`,
    html: layout(
      `<p><strong>${esc(disputerName)}</strong> disputed the score you recorded. An admin will review and finalize it.</p>`,
      url,
      "View match",
    ),
  });
}
