import { expect, type Page } from "@playwright/test";

export const ADMIN_EMAIL = "test@example.com";
export const ADMIN_PASSWORD = "password123";

export function rand() {
  return Math.random().toString(36).slice(2, 8);
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  // Scope to the form — the header also has a "Sign in" button.
  await page.getByRole("main").getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function signUp(page: Page, name: string, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Picks an option from a Base UI <Select> identified by its current label text. */
export async function selectOption(
  page: Page,
  triggerText: string,
  optionName: string,
) {
  await page
    .locator('[data-slot="select-trigger"]', { hasText: triggerText })
    .click();
  await page.getByRole("option", { name: optionName }).click();
}

/** The <leagueId> from an /admin/leagues/<id> URL. */
export function leagueIdFromUrl(url: string) {
  return url.split("/admin/leagues/")[1].split(/[/?#]/)[0];
}

/** Signs out the current user and creates a brand-new player. Returns the email. */
export async function signUpFresh(page: Page, name: string) {
  const email = `e2e-${rand()}@example.com`;
  await page.context().clearCookies();
  await signUp(page, name, email);
  return email;
}

/** Admin must be signed in. Creates a league and returns to its detail page. */
export async function adminCreateLeague(page: Page, name: string) {
  await page.goto("/admin");
  await page.getByLabel("League name").fill(name);
  await page.getByRole("button", { name: "Create league" }).click();
  await expect(page).toHaveURL(/\/admin\/leagues\//);
  return leagueIdFromUrl(page.url());
}

/** On a league detail page: adds a team (optionally with a captain email). */
export async function adminAddTeam(
  page: Page,
  name: string,
  captainEmail?: string,
) {
  await page.getByLabel("Team name").fill(name);
  if (captainEmail) {
    await page.getByLabel("Captain email (optional)").fill(captainEmail);
  }
  await page.getByRole("button", { name: "Add team" }).click();
  await expect(page.getByText(name)).toBeVisible();
}

/** Resolves a team's id by reading its link on the public league page. */
export async function teamIdByName(
  page: Page,
  leagueId: string,
  name: string,
) {
  await page.goto(`/leagues/${leagueId}`);
  const href = await page
    .getByRole("link", { name })
    .getAttribute("href");
  return href!.split("/teams/")[1];
}

export async function proposeMatch(
  page: Page,
  teamId: string,
  opponentName: string,
  when = "2026-08-01T18:00",
  location = "Court 1",
) {
  await page.goto(`/teams/${teamId}`);
  await selectOption(page, "Choose a team", opponentName);
  await page.getByLabel("Date & time").fill(when);
  await page.getByLabel("Location (optional)").fill(location);
  await page.getByRole("button", { name: "Propose match" }).click();
  await expect(page.getByText("Waiting for")).toBeVisible();
}

export async function acceptMatch(page: Page, teamId: string) {
  await page.goto(`/teams/${teamId}`);
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText("Scheduled")).toBeVisible();
}

export async function enterScore(
  page: Page,
  teamId: string,
  my: number,
  opp: number,
) {
  await page.goto(`/teams/${teamId}`);
  await page.getByRole("button", { name: "Enter score", exact: true }).click();
  const scores = page.getByRole("spinbutton");
  await scores.nth(0).fill(String(my));
  await scores.nth(1).fill(String(opp));
  await page.getByRole("button", { name: "Save score" }).click();
  await expect(page.getByText("Awaiting confirmation")).toBeVisible();
}

/** Signs up a fresh player, requests to join, then approves as admin. */
export async function addPlayerViaRequest(
  page: Page,
  teamId: string,
  playerName: string,
) {
  const email = await signUpFresh(page, playerName);
  await page.goto(`/teams/${teamId}`);
  await page.getByRole("button", { name: "Request to join" }).click();
  await expect(page.getByText(/request to join is pending/i)).toBeVisible();

  await page.context().clearCookies();
  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto(`/teams/${teamId}`);
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("No pending requests.")).toBeVisible();
  return email;
}
