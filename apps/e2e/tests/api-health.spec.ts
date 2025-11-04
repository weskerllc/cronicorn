import { expect, test } from "@playwright/test";

test.describe("API - Health Check", () => {
  test("should respond to health check endpoint", async ({ request }) => {
    // Make a direct HTTP request to the API health endpoint
    const response = await request.get("http://localhost:3333/api/health");

    // Verify successful response
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    // Verify response body
    const body = await response.json();
    expect(body).toHaveProperty("status", "ok");
    expect(body).toHaveProperty("timestamp");

    // Verify timestamp is recent (within last 5 seconds)
    const timestamp = new Date(body.timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    expect(diffMs).toBeLessThan(5000);
  });
});
