import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  adminAddTeam,
  adminCreateLeague,
  proposeMatch,
  rand,
  signIn,
  teamIdByName,
} from "./helpers";

test("a match proposal can be countered, then accepted", async ({ page }) => {
  const sfx = rand();
  const teamA = `E2E A ${sfx}`;
  const teamB = `E2E B ${sfx}`;

  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  const leagueId = await adminCreateLeague(page, `E2E Counter ${sfx}`);
  await adminAddTeam(page, teamA);
  await adminAddTeam(page, teamB);
  const teamAId = await teamIdByName(page, leagueId, teamA);
  const teamBId = await teamIdByName(page, leagueId, teamB);

  // A proposes.
  await proposeMatch(page, teamAId, teamB, "2026-08-01T18:00");

  // B counters with a new time — the turn flips back to A.
  await page.goto(`/teams/${teamBId}`);
  await page.getByRole("button", { name: "Counter" }).click();
  await page.getByLabel("New date & time").fill("2026-08-02T20:00");
  await page.getByLabel("Location", { exact: true }).fill("Court 9");
  await page.getByRole("button", { name: "Send counter" }).click();
  await expect(page.getByText("Waiting for")).toBeVisible();

  // A now sees the counter and accepts.
  await page.goto(`/teams/${teamAId}`);
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText("Scheduled")).toBeVisible();
  await expect(page.getByText("Court 9")).toBeVisible();
});
