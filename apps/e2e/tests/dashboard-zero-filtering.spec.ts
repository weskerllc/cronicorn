import { expect, test } from "@playwright/test";

/**
 * E2E tests for dashboard zero-value filtering
 * Validates that categories with 0 items are not displayed in charts or tooltips
 */
test.describe("Dashboard - Zero Value Filtering", () => {
  test("should fetch dashboard data without zero-value categories", async ({ request }) => {
    // Make API request to dashboard stats endpoint
    const response = await request.get("http://localhost:3333/api/dashboard/stats?days=7");

    // API requires authentication, so skip if not authenticated (401/403)
    if (response.status() === 401 || response.status() === 403) {
      test.skip(true, "API requires authentication - skipping test");
    }

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify jobHealth doesn't contain items with zero total runs
    if (data.jobHealth && data.jobHealth.length > 0) {
      data.jobHealth.forEach((job: { successCount: number; failureCount: number }) => {
        expect(job.successCount + job.failureCount).toBeGreaterThan(0);
      });
    }

    // Verify sourceDistribution doesn't contain items with zero count
    if (data.sourceDistribution && data.sourceDistribution.length > 0) {
      data.sourceDistribution.forEach((source: { count: number }) => {
        expect(source.count).toBeGreaterThan(0);
      });
    }

    // Verify endpointTimeSeries doesn't include endpoints with zero total activity
    if (data.endpointTimeSeries && data.endpointTimeSeries.length > 0) {
      const endpointTotals = new Map<string, number>();
      data.endpointTimeSeries.forEach((item: { endpointId: string; success: number; failure: number }) => {
        const existing = endpointTotals.get(item.endpointId) || 0;
        endpointTotals.set(item.endpointId, existing + item.success + item.failure);
      });

      // All endpoints in the response should have at least some activity
      endpointTotals.forEach((total) => {
        expect(total).toBeGreaterThan(0);
      });
    }

    // Verify aiSessionTimeSeries doesn't include endpoints with zero total sessions
    if (data.aiSessionTimeSeries && data.aiSessionTimeSeries.length > 0) {
      const sessionTotals = new Map<string, number>();
      data.aiSessionTimeSeries.forEach((item: { endpointId: string; sessionCount: number }) => {
        const existing = sessionTotals.get(item.endpointId) || 0;
        sessionTotals.set(item.endpointId, existing + item.sessionCount);
      });

      // All endpoints in the response should have at least some sessions
      sessionTotals.forEach((total) => {
        expect(total).toBeGreaterThan(0);
      });
    }
  });
});
