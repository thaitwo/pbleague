import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  acceptMatch,
  adminAddTeam,
  adminCreateLeague,
  enterScore,
  proposeMatch,
  rand,
  signIn,
  teamIdByName,
} from "./helpers";

test("a disputed score is resolved by an admin and hits the standings", async ({
  page,
}) => {
  const sfx = rand();
  const teamA = `E2E A ${sfx}`;
  const teamB = `E2E B ${sfx}`;

  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  const leagueId = await adminCreateLeague(page, `E2E Dispute ${sfx}`);
  await adminAddTeam(page, teamA);
  await adminAddTeam(page, teamB);
  const teamAId = await teamIdByName(page, leagueId, teamA);
  const teamBId = await teamIdByName(page, leagueId, teamB);

  // Schedule + record a score from A.
  await proposeMatch(page, teamAId, teamB);
  await acceptMatch(page, teamBId);
  await enterScore(page, teamAId, 11, 5);

  // B disputes it.
  await page.goto(`/teams/${teamBId}`);
  await page.getByRole("button", { name: "Dispute" }).click();
  await expect(page.getByText("Disputed")).toBeVisible();

  // The admin console surfaces it; follow the Resolve link.
  await page.goto("/admin");
  await expect(
    page.getByText("Disputed scores need your review"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resolve" }).click();
  await expect(page).toHaveURL(/\/teams\//);

  // Admin sets the final score.
  await page.getByRole("button", { name: "Resolve score" }).click();
  const scores = page.getByRole("spinbutton");
  await scores.nth(0).fill("11");
  await scores.nth(1).fill("7");
  await page.getByRole("button", { name: "Save final score" }).click();
  await expect(page.getByText("Final")).toBeVisible();

  // Standings reflect the resolved result.
  await page.goto(`/leagues/${leagueId}`);
  const aRow = page.getByRole("row", { name: new RegExp(teamA) });
  await expect(aRow).toContainText("W1");
});
