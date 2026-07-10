import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  leagueIdFromUrl,
  rand,
  signIn,
} from "./helpers";

test("player requests to join a team and a captain approves", async ({
  page,
}) => {
  const sfx = rand();
  const teamName = `E2E Team ${sfx}`;
  const playerName = `E2E Joiner ${sfx}`;
  const playerEmail = `e2e-${rand()}@example.com`;

  // --- Admin creates a league + team ---
  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/admin");
  await page.getByLabel("League name").fill(`E2E Join ${sfx}`);
  await page.getByRole("button", { name: "Create league" }).click();
  await expect(page).toHaveURL(/\/admin\/leagues\//);
  const leagueId = leagueIdFromUrl(page.url());
  await page.getByLabel("Team name").fill(teamName);
  await page.getByRole("button", { name: "Add team" }).click();
  await expect(page.getByText(teamName)).toBeVisible();

  await page.goto(`/leagues/${leagueId}`);
  await page.getByRole("link", { name: teamName }).click();
  await expect(page).toHaveURL(/\/teams\//);
  const teamId = page.url().split("/teams/")[1].split(/[/?#]/)[0];

  // --- A fresh player requests to join ---
  await page.context().clearCookies();
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(playerName);
  await page.getByLabel("Email").fill(playerEmail);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto(`/teams/${teamId}`);
  await page.getByRole("button", { name: "Request to join" }).click();
  await expect(page.getByText(/request to join is pending/i)).toBeVisible();

  // --- Admin approves the request ---
  await page.context().clearCookies();
  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto(`/teams/${teamId}`);
  await expect(page.getByText(playerName)).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("No pending requests.")).toBeVisible();

  // --- Player now sees the team on their dashboard ---
  await page.context().clearCookies();
  await signIn(page, playerEmail, "password123");
  await expect(page.getByText(teamName)).toBeVisible();
});
