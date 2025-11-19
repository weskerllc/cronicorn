import { expect, test } from "@playwright/test";

/**
 * Take screenshots of the dashboard to verify zero-filtering visually
 */
test.describe("Dashboard Screenshots", () => {
  test("capture dashboard screenshots", async ({ page }) => {
    // Navigate to login page
    await page.goto("http://localhost:5173/");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Try to login if we see a login form
    try {
      const emailInput = await page.locator("input[type=\"email\"]").first();
      if (await emailInput.isVisible({ timeout: 3000 })) {
        await emailInput.fill("admin@example.com");
        await page.locator("input[type=\"password\"]").first().fill("devpassword");
        await page.locator("button[type=\"submit\"]").click();

        // Wait for authentication
        await page.waitForTimeout(2000);
      }
    }
    catch {
      // Might already be logged in or different auth flow
    }

    // Navigate to dashboard
    await page.goto("http://localhost:5173/dashboard");
    await page.waitForLoadState("networkidle");

    // Wait for dashboard to load data
    await page.waitForTimeout(3000);

    // Take full page screenshot
    await page.screenshot({
      path: "/tmp/dashboard-full-page.png",
      fullPage: true,
    });

    // Try to capture individual charts
    try {
      const jobHealthCard = page.locator("text=\"Runs Per Job\"").locator("..").first();
      if (await jobHealthCard.isVisible({ timeout: 2000 })) {
        await jobHealthCard.screenshot({ path: "/tmp/job-health-chart.png" });
      }
    }
    catch {
    }

    try {
      const schedulingCard = page.locator("text=\"Scheduling Intelligence\"").locator("..").first();
      if (await schedulingCard.isVisible({ timeout: 2000 })) {
        await schedulingCard.screenshot({ path: "/tmp/scheduling-intelligence-chart.png" });
      }
    }
    catch {
    }

    try {
      const executionCard = page.locator("text=\"Execution Timeline\"").locator("..").first();
      if (await executionCard.isVisible({ timeout: 2000 })) {
        await executionCard.screenshot({ path: "/tmp/execution-timeline-chart.png" });
      }
    }
    catch {
    }

    try {
      const aiSessionsCard = page.locator("text=\"AI Sessions Timeline\"").locator("..").first();
      if (await aiSessionsCard.isVisible({ timeout: 2000 })) {
        await aiSessionsCard.screenshot({ path: "/tmp/ai-sessions-chart.png" });
      }
    }
    catch {
    }

    // Test passes - we just wanted to capture screenshots
    expect(true).toBe(true);
  });
});
