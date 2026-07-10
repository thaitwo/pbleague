import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, rand, signIn } from "./helpers";

test("player can sign up, sign out, and sign back in", async ({ page }) => {
  const email = `e2e-${rand()}@example.com`;

  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E Player");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");

  await signIn(page, email, "password123");
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
});

test("admin sees the admin console", async ({ page }) => {
  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Admin console" }),
  ).toBeVisible();
});
