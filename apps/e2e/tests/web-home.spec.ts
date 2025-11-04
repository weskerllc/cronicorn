import { expect, test } from "@playwright/test";

test.describe("Web App - Home Page", () => {
  test("should load the home page successfully", async ({ page }) => {
    // Navigate to the home page
    await page.goto("/");

    // Wait for the page to be fully loaded
    await page.waitForLoadState("networkidle");

    // Verify the page loaded by checking the URL
    expect(page.url()).toBe("http://localhost:5173/");

    // Verify the page title or a key element exists
    // This is a minimal check - adjust based on your actual home page content
    await expect(page.locator("body")).toBeVisible();
  });

  test("should have no console errors on home page", async ({ page }) => {
    const consoleErrors: string[] = [];

    // Listen for console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the home page
    await page.goto("/");

    // Wait for the page to be fully loaded
    await page.waitForLoadState("networkidle");

    // Filter out expected API connection errors (API server not running in E2E tests)
    const unexpectedErrors = consoleErrors.filter(
      (error) => !error.includes("Failed to load resource") && !error.includes("500"),
    );

    // Verify no unexpected console errors occurred
    expect(unexpectedErrors).toHaveLength(0);
  });
});
