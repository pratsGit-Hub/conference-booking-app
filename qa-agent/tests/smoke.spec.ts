import { test, expect } from "@playwright/test";

test("homepage loads successfully", async ({ page }) => {
  const response = await page.goto("/");

  expect(response).not.toBeNull();
  expect(response!.status()).toBeLessThan(400);
});

test("login page is reachable", async ({ page }) => {
  const response = await page.goto("/login");

  expect(response).not.toBeNull();
  expect(response!.status()).toBeLessThan(400);
});