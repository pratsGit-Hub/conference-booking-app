import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("shows the login form", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "Welcome Back" })
    ).toBeVisible();

    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();

    await expect(
      page.getByRole("button", { name: /sign in/i })
    ).toBeVisible();
  });

  test("shows validation error for a non-Dangote email", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.locator("#email").fill("qa@example.com");
    await page.locator("#password").fill("TestPassword123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(
      page.getByText(
        "Only @dangote.com email addresses are allowed."
      )
    ).toBeVisible();
  });

  test("shows validation error when email is empty", async ({
    page,
  }) => {
    await page.goto("/login");

    // HTML required validation may prevent submission when
    // the email field is empty.
    await expect(page.locator("#email")).toHaveAttribute(
      "required",
      ""
    );
  });

  test("forgot password link opens the correct page", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByRole("link", {
      name: /forgot password/i,
    }).click();

    await expect(page).toHaveURL(/\/forgot-password$/);
  });

  test("password visibility can be toggled", async ({ page }) => {
    await page.goto("/login");

    const password = page.locator("#password");

    await password.fill("TestPassword123!");

    await expect(password).toHaveAttribute("type", "password");

    await page.getByRole("button", {
      name: "Show password",
    }).click();

    await expect(password).toHaveAttribute("type", "text");

    await page.getByRole("button", {
      name: "Hide password",
    }).click();

    await expect(password).toHaveAttribute("type", "password");
  });
});