import { expect, test } from "@playwright/test";

import { authenticateAsAdmin } from "../fixtures/auth.js";

/**
 * Example E2E test demonstrating auto-login functionality
 *
 * This test shows how to use the authenticateAsAdmin helper
 * to bypass the login form and directly test authenticated features.
 */

test.describe("Authenticated Dashboard Access", () => {
  test("should access dashboard without manual login", async ({ page }) => {
    // Authenticate using the test-only endpoint
    await authenticateAsAdmin(page);

    // Navigate to the dashboard page (which requires authentication)
    await page.goto("/dashboard");

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Verify we're on the dashboard (not redirected to login)
    expect(page.url()).toContain("/dashboard");

    // Verify the dashboard content is visible
    // Note: Adjust this selector based on your actual dashboard content
    await expect(page.locator("body")).toBeVisible();
  });

  test("should maintain authentication across page navigations", async ({ page }) => {
    // Authenticate once
    await authenticateAsAdmin(page);

    // Navigate to dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/dashboard");

    // Navigate to another protected page (if available)
    // The authentication should persist
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Navigate back to dashboard - should still be authenticated
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/dashboard");
  });

  test("should handle API requests with authentication", async ({ page }) => {
    // Authenticate
    await authenticateAsAdmin(page);

    // Make an authenticated API request
    const response = await page.request.get("http://localhost:3333/api/dashboard");

    // The key thing is we should not get a 401 Unauthorized
    // (the endpoint may return 404 or other status codes for other reasons)
    expect(response.status()).not.toBe(401);
  });
});
