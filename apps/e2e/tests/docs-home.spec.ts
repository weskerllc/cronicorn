import { expect, test } from "@playwright/test";

test.describe("Docs Site - Home Page", () => {
  test("should load the docs home page successfully", async ({ page }) => {
    // Navigate to the docs site (Docusaurus default port is 3000)
    await page.goto("http://localhost:3000");

    // Wait for the page to be fully loaded
    await page.waitForLoadState("networkidle");

    // Verify the page loaded (Docusaurus pages typically have this class)
    await expect(page.locator("body")).toBeVisible();

    // Check for common Docusaurus elements
    const hasDocusaurusContent = await page.locator(".theme-doc-markdown, .docusaurus-content, main").count();
    expect(hasDocusaurusContent).toBeGreaterThan(0);
  });
  test("should not have console errors", async ({ page }) => {
    const consoleErrors: string[] = [];

    // Listen for console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Filter out expected errors (if any)
    const unexpectedErrors = consoleErrors.filter(
      error => !error.includes("Failed to load resource"),
    );

    expect(unexpectedErrors).toHaveLength(0);
  });
});
