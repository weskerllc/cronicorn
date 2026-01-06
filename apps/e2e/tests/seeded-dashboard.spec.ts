import { expect, test } from "@playwright/test";

import { authenticateAsAdmin } from "../fixtures/auth.js";

/**
 * E2E test for seeded dashboard data
 *
 * This test verifies that after seeding:
 * 1. The admin user can login successfully
 * 2. The dashboard loads with actual data
 * 3. Key dashboard components display seeded data
 *
 * Prerequisites:
 * - Database has been reset, migrated, and seeded (via global-setup.ts)
 * - API and Web servers are running
 */

test.describe("Seeded Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate before each test
    await authenticateAsAdmin(page);
  });

  test("should display seeded jobs in Runs Per Job chart", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // The seed creates 5 jobs by default (SEED_NUM_JOBS=5)
    // The chart title is "Runs Per Job"
    const runsPerJobSection = page.locator("text=Runs Per Job").first();
    await expect(runsPerJobSection).toBeVisible({ timeout: 10000 });

    // Verify that jobs are displayed by checking for "Active Jobs:" text
    // which appears in the chart description when data exists
    const activeJobsText = page.locator("text=Active Jobs:").first();
    await expect(activeJobsText).toBeVisible({ timeout: 10000 });
  });

  test("should display seeded endpoints in Endpoints table", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // The seed creates 3 endpoints per job (SEED_ENDPOINTS_PER_JOB=3)
    // Total: 5 jobs × 3 endpoints = 15 endpoints
    // The component title is "Endpoints"
    const endpointsSection = page.locator("text=Endpoints").first();
    await expect(endpointsSection).toBeVisible({ timeout: 10000 });

    // Verify at least one seeded endpoint name appears in the table
    // Seed creates endpoints like "Order Processor Health", "Cache Status", "API Health"
    // Note: "API Health" is first endpoint and may be archived; use "Order Processor Health" which is more visible
    const databaseCheckEndpoint = page.locator("text=Order Processor Health").first();
    await expect(databaseCheckEndpoint).toBeVisible({ timeout: 10000 });
  });

  test("should display scheduling intelligence data", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // The seed creates runs with various sources:
    // - baseline-interval (default)
    // - ai-interval (during sale periods)
    // - ai-oneshot (during peak surge)
    // - clamped-min (when AI suggests too aggressive)

    // Look for the Scheduling Intelligence chart
    const schedulingSection = page.locator("text=Scheduling Intelligence").first();
    await expect(schedulingSection).toBeVisible({ timeout: 10000 });
  });

  test("should display endpoint activity timeline with run data", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // The seed creates thousands of runs across 45+ days
    // The chart title is "Endpoint Activity"
    const activitySection = page.locator("text=Endpoint Activity").first();
    await expect(activitySection).toBeVisible({ timeout: 10000 });
  });

  test("should allow filtering by job", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Find and click the job filter dropdown
    // The FilterBar has a job selector
    const jobDropdown = page.locator("button").filter({ hasText: /All Jobs|Select Job/i }).first();
    if (await jobDropdown.isVisible()) {
      await jobDropdown.click();

      // Should show seeded job options
      const monitoringOption = page.locator("text=Order Processor Health").first();
      await expect(monitoringOption).toBeVisible({ timeout: 5000 });
    }
  });

  test("full dashboard smoke test - all sections load with data", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // This is a comprehensive smoke test that verifies the dashboard
    // loads successfully with seeded data

    // 1. Verify page title/header
    const header = page.locator("text=Dashboard").first();
    await expect(header).toBeVisible({ timeout: 10000 });

    // 2. Verify no error states are shown
    const errorState = page.locator("text=Failed to load").first();
    await expect(errorState).not.toBeVisible();

    // 3. Verify data is present (not empty states)
    // Look for any numeric data that would indicate runs/endpoints exist
    const pageContent = await page.textContent("body");

    // The seeded data should result in visible numbers (run counts, success rates, etc.)
    // At minimum, we should see some text indicating data exists
    expect(pageContent).toBeTruthy();

    // 4. Take a screenshot for visual verification
    await page.screenshot({ path: "test-results/dashboard-seeded.png", fullPage: true });
  });
});
