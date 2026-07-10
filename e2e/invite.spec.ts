import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  adminAddTeam,
  adminCreateLeague,
  rand,
  signIn,
  signUp,
  teamIdByName,
} from "./helpers";

test("a player joins a team via an invite link", async ({ page }) => {
  const sfx = rand();
  const teamName = `E2E Invite Team ${sfx}`;

  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  const leagueId = await adminCreateLeague(page, `E2E Invite ${sfx}`);
  await adminAddTeam(page, teamName);
  const teamId = await teamIdByName(page, leagueId, teamName);

  // Admin generates the invite link and reads it out of the panel.
  await page.goto(`/teams/${teamId}`);
  await page.getByRole("button", { name: "Create invite link" }).click();
  const link = await page.locator("input[readonly]").inputValue();
  expect(link).toContain("/join/");
  const joinPath = new URL(link).pathname;

  // A fresh player follows the link and accepts.
  await page.context().clearCookies();
  const email = `e2e-${rand()}@example.com`;
  await signUp(page, "E2E Invitee", email);
  await page.goto(joinPath);
  const acceptButton = page.getByRole("button", { name: "Accept & join team" });
  await expect(acceptButton).toBeVisible();
  await acceptButton.click();

  // They land on the team page as an active member.
  await expect(page).toHaveURL(new RegExp(`/teams/${teamId}`));
  await expect(page.getByText(/\(you\)/)).toBeVisible();
});
