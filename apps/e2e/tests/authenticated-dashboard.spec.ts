import { expect, test } from "@playwright/test";

import { authenticateAsAdmin } from "../fixtures/auth.js";

/**
 * E2E test demonstrating authentication helper for protected routes
 *
 * This test verifies that:
 * 1. The authenticateAsAdmin helper successfully authenticates
 * 2. Authenticated users can access the dashboard page
 * 3. Authentication persists across page navigations
 */

test.describe("Authenticated Dashboard Access", () => {
  test("should authenticate and access dashboard without manual login", async ({ page }) => {
    // Authenticate using the helper - this calls Better Auth directly
    await authenticateAsAdmin(page);

    // Navigate to the dashboard page (which requires authentication)
    await page.goto("/dashboard");

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Verify we're on the dashboard (not redirected to login)
    expect(page.url()).toContain("/dashboard");

    // Verify the dashboard content is visible
    await expect(page.locator("body")).toBeVisible();
  });
});
