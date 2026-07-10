import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  leagueIdFromUrl,
  rand,
  selectOption,
  signIn,
} from "./helpers";

test("admin runs a league end to end: create → schedule → score → standings", async ({
  page,
}) => {
  const sfx = rand();
  const leagueName = `E2E League ${sfx}`;
  const teamA = `E2E Aces ${sfx}`;
  const teamB = `E2E Bees ${sfx}`;

  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);

  // --- Create a league ---
  await page.goto("/admin");
  await page.getByLabel("League name").fill(leagueName);
  await page.getByRole("button", { name: "Create league" }).click();
  await expect(page).toHaveURL(/\/admin\/leagues\//);
  await expect(page.getByRole("heading", { name: leagueName })).toBeVisible();
  const leagueId = leagueIdFromUrl(page.url());

  // --- Add two teams ---
  await page.getByLabel("Team name").fill(teamA);
  await page.getByRole("button", { name: "Add team" }).click();
  await expect(page.getByText(teamA)).toBeVisible();
  await page.getByLabel("Team name").fill(teamB);
  await page.getByRole("button", { name: "Add team" }).click();
  await expect(page.getByText(teamB)).toBeVisible();

  // --- Open team A via the public league page ---
  await page.goto(`/leagues/${leagueId}`);
  await page.getByRole("link", { name: teamA }).click();
  await expect(page).toHaveURL(/\/teams\//);
  const teamAId = page.url().split("/teams/")[1].split(/[/?#]/)[0];

  // --- Propose a match A vs B ---
  await selectOption(page, "Choose a team", teamB);
  await page.getByLabel("Date & time").fill("2026-08-01T18:00");
  await page.getByLabel("Location (optional)").fill("Court 1");
  await page.getByRole("button", { name: "Propose match" }).click();
  await expect(page.getByText(`vs ${teamB}`)).toBeVisible();
  await expect(page.getByText("Waiting for")).toBeVisible();

  // --- Accept from team B ---
  await page.goto(`/leagues/${leagueId}`);
  await page.getByRole("link", { name: teamB }).click();
  await expect(page).toHaveURL(/\/teams\//);
  const teamBId = page.url().split("/teams/")[1].split(/[/?#]/)[0];
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText("Scheduled")).toBeVisible();

  // --- Enter the score from team A (A wins 11–5) ---
  await page.goto(`/teams/${teamAId}`);
  await page.getByRole("button", { name: "Enter score", exact: true }).click();
  const scores = page.getByRole("spinbutton");
  await scores.nth(0).fill("11"); // A
  await scores.nth(1).fill("5"); // B
  await page.getByRole("button", { name: "Save score" }).click();
  await expect(page.getByText("Awaiting confirmation")).toBeVisible();

  // --- Confirm from team B ---
  await page.goto(`/teams/${teamBId}`);
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Final")).toBeVisible();

  // --- Standings reflect the confirmed result ---
  await page.goto(`/leagues/${leagueId}`);
  const aRow = page.getByRole("row", { name: new RegExp(teamA) });
  await expect(aRow).toContainText("W1");
  await expect(page.getByText(new RegExp(`${teamA} def\\. ${teamB}`))).toBeVisible();
});
