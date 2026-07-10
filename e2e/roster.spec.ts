import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  addPlayerViaRequest,
  adminAddTeam,
  adminCreateLeague,
  rand,
  signIn,
  teamIdByName,
} from "./helpers";

test("captain can promote a player to co-captain, demote, and remove", async ({
  page,
}) => {
  const sfx = rand();
  const teamName = `E2E Roster ${sfx}`;
  const playerName = `E2E Member ${sfx}`;

  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  const leagueId = await adminCreateLeague(page, `E2E RosterL ${sfx}`);
  await adminAddTeam(page, teamName);
  const teamId = await teamIdByName(page, leagueId, teamName);

  // Get a player onto the roster, then manage them (ends signed in as admin).
  await addPlayerViaRequest(page, teamId, playerName);
  await page.goto(`/teams/${teamId}`);
  await expect(page.getByText(playerName)).toBeVisible();

  // Promote to co-captain.
  await page.getByRole("button", { name: "Make co-captain" }).click();
  await expect(page.getByText("Co-captain")).toBeVisible();

  // Demote back to player.
  await page.getByRole("button", { name: "Remove co-captain" }).click();
  await expect(
    page.getByRole("button", { name: "Make co-captain" }),
  ).toBeVisible();

  // Remove from the team (confirm dialog).
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("No active members yet.")).toBeVisible();
});
