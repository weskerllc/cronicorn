import { schema } from "@cronicorn/adapter-drizzle";
import { afterAll, describe } from "vitest";

import type { Env } from "../../../lib/config.js";

import { createApp } from "../../../app.js";
import { closeTestPool, createTestUser, expect, test } from "../../../lib/__tests__/fixtures.js";
import { createMockAuth, createMockSession } from "../../../lib/__tests__/test-helpers.js";

/**
 * Cross-user authorization tests for job routes.
 *
 * These tests verify that users cannot access, modify, or view other users' resources.
 * All tests follow the pattern:
 * 1. User A creates a resource
 * 2. User B attempts to access that resource
 * 3. User B receives HTTP 404 (not 403/500/200) with no data leakage
 *
 * Uses real database with transaction-per-test pattern.
 * Auth is mocked via test helpers with different user IDs.
 */

// Helper to safely extract JSON from response
// eslint-disable-next-line ts/no-explicit-any
const getJson = async (res: Response): Promise<any> => await res.json();

// Two distinct users for cross-user access tests
const userAId = "user-a-owner";
const userBId = "user-b-attacker";

const testConfig: Env = {
  NODE_ENV: "test",
  LOG_LEVEL: "debug",
  PORT: 3000,
  DATABASE_URL: "postgres://test",
  DB_POOL_MAX: 5,
  DB_POOL_IDLE_TIMEOUT_MS: 20000,
  DB_POOL_CONNECTION_TIMEOUT_MS: 10000,
  API_URL: "http://localhost:3000",
  WEB_URL: "http://localhost:5173",
  BETTER_AUTH_SECRET: "test-secret-must-be-at-least-32-characters-long",
  BETTER_AUTH_URL: "http://localhost:3000/api/auth",
  GITHUB_CLIENT_ID: "test_client_id",
  GITHUB_CLIENT_SECRET: "test_client_secret",
  STRIPE_SECRET_KEY: "sk_test_fake_key_for_testing",
  ADMIN_USER_EMAIL: "admin@example.com",
  ADMIN_USER_PASSWORD: "test-password-123",
  ADMIN_USER_NAME: "Admin User",
  STRIPE_WEBHOOK_SECRET: "whsec_test_fake_secret",
  STRIPE_PRICE_PRO: "price_test_pro",
  STRIPE_PRICE_PRO_ANNUAL: "price_test_pro_annual",
  STRIPE_PRICE_ENTERPRISE: "price_test_enterprise",
  BASE_URL: "http://localhost:5173",
  RATE_LIMIT_MUTATION_RPM: 60,
  RATE_LIMIT_READ_RPM: 120,
};

/**
 * Helper to create an app instance for a specific user.
 */
async function createAppForUser(tx: Parameters<typeof createApp>[0], userId: string) {
  const mockSession = createMockSession(userId);
  const mockAuth = createMockAuth(mockSession);
  return createApp(tx, testConfig, mockAuth, { useTransactions: false });
}

/**
 * Helper to set up the common test scenario:
 * - Creates both User A and User B
 * - Creates a job owned by User A
 * - Returns app instances for both users and the created job
 */
async function setupCrossUserScenario(tx: Parameters<typeof createApp>[0]) {
  // Create both test users
  await createTestUser(tx, { id: userAId, email: "usera@example.com" });
  await createTestUser(tx, { id: userBId, email: "userb@example.com" });

  // Create app for User A and create a job
  const { app: appUserA } = await createAppForUser(tx, userAId);
  const createJobRes = await appUserA.request("/api/jobs", {
    method: "POST",
    body: JSON.stringify({
      name: "User A's Private Job",
      description: "This job belongs to User A only",
    }),
    headers: { "Content-Type": "application/json" },
  });
  const job = await getJson(createJobRes);

  // Create app for User B (the "attacker")
  const { app: appUserB } = await createAppForUser(tx, userBId);

  return { appUserA, appUserB, job };
}

/**
 * Helper to set up a scenario with an endpoint:
 * - Creates both users
 * - Creates a job owned by User A
 * - Creates an endpoint on that job
 * - Returns app instances for both users, the job, and the endpoint
 */
async function setupCrossUserEndpointScenario(tx: Parameters<typeof createApp>[0]) {
  const { appUserA, appUserB, job } = await setupCrossUserScenario(tx);

  // Create an endpoint on User A's job
  const createEndpointRes = await appUserA.request(`/api/jobs/${job.id}/endpoints`, {
    method: "POST",
    body: JSON.stringify({
      name: "User A's Private Endpoint",
      url: "https://example.com/webhook",
      method: "POST",
      baselineCron: "0 * * * *",
    }),
    headers: { "Content-Type": "application/json" },
  });
  const endpoint = await getJson(createEndpointRes);

  return { appUserA, appUserB, job, endpoint };
}

describe("jobs authorization - cross-user access prevention", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  // ==================== Job Routes ====================

  describe("gET /api/jobs/:id", () => {
    test("returns 404 when User B tries to access User A's job", async ({ tx }) => {
      const { appUserB, job } = await setupCrossUserScenario(tx);

      // User B attempts to access User A's job
      const res = await appUserB.request(`/api/jobs/${job.id}`, {
        method: "GET",
      });

      // Should receive 404 (not 403 to avoid leaking existence of resource)
      expect(res.status).toBe(404);

      // Verify no data leakage in response body
      const data = await getJson(res);
      expect(data).not.toHaveProperty("name");
      expect(data).not.toHaveProperty("description");
      expect(data).not.toHaveProperty("userId");
      // The response should be an error object, not the job data
      expect(data.name).not.toBe("User A's Private Job");
    });
  });

  describe("pATCH /api/jobs/:id", () => {
    test("returns 404 when User B tries to update User A's job", async ({ tx }) => {
      const { appUserA, appUserB, job } = await setupCrossUserScenario(tx);

      // Verify the original job state (User A can still access it)
      const originalRes = await appUserA.request(`/api/jobs/${job.id}`, {
        method: "GET",
      });
      expect(originalRes.status).toBe(200);
      const originalJob = await getJson(originalRes);
      expect(originalJob.name).toBe("User A's Private Job");

      // User B attempts to update User A's job
      const res = await appUserB.request(`/api/jobs/${job.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: "Hijacked by User B",
          description: "This should not be allowed",
        }),
        headers: { "Content-Type": "application/json" },
      });

      // Should receive 404 (not 403 to avoid leaking existence of resource)
      expect(res.status).toBe(404);

      // Verify no data leakage in response body
      const data = await getJson(res);
      expect(data).not.toHaveProperty("name");
      expect(data).not.toHaveProperty("description");
      expect(data).not.toHaveProperty("userId");

      // Verify the job was NOT modified (User A's data is intact)
      const verifyRes = await appUserA.request(`/api/jobs/${job.id}`, {
        method: "GET",
      });
      expect(verifyRes.status).toBe(200);
      const verifyJob = await getJson(verifyRes);
      expect(verifyJob.name).toBe("User A's Private Job");
      expect(verifyJob.name).not.toBe("Hijacked by User B");
    });
  });

  describe("dELETE /api/jobs/:id", () => {
    test("returns 404 when User B tries to delete User A's job", async ({ tx }) => {
      const { appUserA, appUserB, job } = await setupCrossUserScenario(tx);

      // Verify the job exists before the delete attempt (User A can access it)
      const originalRes = await appUserA.request(`/api/jobs/${job.id}`, {
        method: "GET",
      });
      expect(originalRes.status).toBe(200);

      // User B attempts to delete User A's job
      const res = await appUserB.request(`/api/jobs/${job.id}`, {
        method: "DELETE",
      });

      // Should receive 404 (not 403 to avoid leaking existence of resource)
      expect(res.status).toBe(404);

      // Verify no data leakage in response body
      const data = await getJson(res);
      expect(data).not.toHaveProperty("name");
      expect(data).not.toHaveProperty("description");
      expect(data).not.toHaveProperty("userId");

      // Verify the job was NOT deleted (User A can still access it)
      const verifyRes = await appUserA.request(`/api/jobs/${job.id}`, {
        method: "GET",
      });
      expect(verifyRes.status).toBe(200);
      const verifyJob = await getJson(verifyRes);
      expect(verifyJob.name).toBe("User A's Private Job");
    });
  });

  describe("pOST /api/jobs/:id/pause", () => {
    test("returns 404 when User B tries to pause User A's job", async ({ tx }) => {
      const { appUserA, appUserB, job } = await setupCrossUserScenario(tx);

      // Verify the original job state (User A can still access it and it's active)
      const originalRes = await appUserA.request(`/api/jobs/${job.id}`, {
        method: "GET",
      });
      expect(originalRes.status).toBe(200);
      const originalJob = await getJson(originalRes);
      expect(originalJob.status).toBe("active");

      // User B attempts to pause User A's job
      const res = await appUserB.request(`/api/jobs/${job.id}/pause`, {
        method: "POST",
      });

      // Should receive 404 (not 403 to avoid leaking existence of resource)
      expect(res.status).toBe(404);

      // Verify no data leakage in response body
      const data = await getJson(res);
      expect(data).not.toHaveProperty("name");
      expect(data).not.toHaveProperty("description");
      expect(data).not.toHaveProperty("userId");

      // Verify the job was NOT paused (User A's data is intact)
      const verifyRes = await appUserA.request(`/api/jobs/${job.id}`, {
        method: "GET",
      });
      expect(verifyRes.status).toBe(200);
      const verifyJob = await getJson(verifyRes);
      expect(verifyJob.status).toBe("active");
      expect(verifyJob.status).not.toBe("paused");
    });
  });

  // ==================== Endpoint Routes (via Job) ====================

  describe("gET /api/jobs/:id/endpoints", () => {
    test("returns 404 when User B tries to list User A's job endpoints", async ({ tx }) => {
      const { appUserA, appUserB, job, endpoint } = await setupCrossUserEndpointScenario(tx);

      // Verify User A can list their own endpoints
      const ownerRes = await appUserA.request(`/api/jobs/${job.id}/endpoints`, {
        method: "GET",
      });
      expect(ownerRes.status).toBe(200);
      const ownerData = await getJson(ownerRes);
      expect(ownerData.endpoints).toHaveLength(1);
      expect(ownerData.endpoints[0].id).toBe(endpoint.id);
      expect(ownerData.endpoints[0].name).toBe("User A's Private Endpoint");

      // User B attempts to list User A's job endpoints
      const res = await appUserB.request(`/api/jobs/${job.id}/endpoints`, {
        method: "GET",
      });

      // Should receive 404 (not 403 to avoid leaking existence of resource)
      expect(res.status).toBe(404);

      // Verify no data leakage in response body
      const data = await getJson(res);
      expect(data).not.toHaveProperty("name");
      expect(data).not.toHaveProperty("url");
      expect(data).not.toHaveProperty("method");
      // Ensure it's not an array of endpoints
      expect(Array.isArray(data)).toBe(false);
    });
  });

  describe("pOST /api/jobs/:id/endpoints", () => {
    test("returns 404 when User B tries to add endpoint to User A's job", async ({ tx }) => {
      const { appUserA, appUserB, job } = await setupCrossUserScenario(tx);

      // Verify User A can create an endpoint on their own job
      const ownerRes = await appUserA.request(`/api/jobs/${job.id}/endpoints`, {
        method: "POST",
        body: JSON.stringify({
          name: "User A's Valid Endpoint",
          url: "https://example.com/valid",
          method: "POST",
          baselineCron: "0 * * * *",
        }),
        headers: { "Content-Type": "application/json" },
      });
      expect(ownerRes.status).toBe(201);
      const ownerEndpoint = await getJson(ownerRes);
      expect(ownerEndpoint.name).toBe("User A's Valid Endpoint");

      // User B attempts to add an endpoint to User A's job
      const res = await appUserB.request(`/api/jobs/${job.id}/endpoints`, {
        method: "POST",
        body: JSON.stringify({
          name: "Malicious Endpoint by User B",
          url: "https://attacker.com/steal-data",
          method: "POST",
          baselineCron: "* * * * *",
        }),
        headers: { "Content-Type": "application/json" },
      });

      // Should receive 404 (not 403 to avoid leaking existence of resource)
      expect(res.status).toBe(404);

      // Verify no data leakage in response body
      const data = await getJson(res);
      expect(data).not.toHaveProperty("name");
      expect(data).not.toHaveProperty("url");
      expect(data).not.toHaveProperty("method");
      expect(data).not.toHaveProperty("baselineCron");

      // Verify only User A's endpoint exists on the job (the malicious endpoint was NOT created)
      const verifyRes = await appUserA.request(`/api/jobs/${job.id}/endpoints`, {
        method: "GET",
      });
      expect(verifyRes.status).toBe(200);
      const endpoints = await getJson(verifyRes);
      expect(endpoints.endpoints).toHaveLength(1);
      expect(endpoints.endpoints[0].name).toBe("User A's Valid Endpoint");
      expect(endpoints.endpoints[0].name).not.toBe("Malicious Endpoint by User B");
    });
  });

  // ==================== Endpoint Routes (via Job) ====================

  describe("pATCH /api/jobs/:jobId/endpoints/:id", () => {
    test("returns 404 when User B tries to update User A's endpoint", async ({ tx }) => {
      const { appUserA, appUserB, job, endpoint } = await setupCrossUserEndpointScenario(tx);

      // Verify the original endpoint state (User A can still access it)
      const originalRes = await appUserA.request(`/api/jobs/${job.id}/endpoints/${endpoint.id}`, {
        method: "GET",
      });
      expect(originalRes.status).toBe(200);
      const originalEndpoint = await getJson(originalRes);
      expect(originalEndpoint.name).toBe("User A's Private Endpoint");
      expect(originalEndpoint.url).toBe("https://example.com/webhook");

      // User B attempts to update User A's endpoint
      const res = await appUserB.request(`/api/jobs/${job.id}/endpoints/${endpoint.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: "Hijacked Endpoint by User B",
          url: "https://attacker.com/steal-data",
        }),
        headers: { "Content-Type": "application/json" },
      });

      // Should receive 404 (not 403 to avoid leaking existence of resource)
      expect(res.status).toBe(404);

      // Verify no data leakage in response body
      const data = await getJson(res);
      expect(data).not.toHaveProperty("name");
      expect(data).not.toHaveProperty("url");
      expect(data).not.toHaveProperty("method");
      expect(data).not.toHaveProperty("baselineCron");

      // Verify the endpoint was NOT modified (User A's data is intact)
      const verifyRes = await appUserA.request(`/api/jobs/${job.id}/endpoints/${endpoint.id}`, {
        method: "GET",
      });
      expect(verifyRes.status).toBe(200);
      const verifyEndpoint = await getJson(verifyRes);
      expect(verifyEndpoint.name).toBe("User A's Private Endpoint");
      expect(verifyEndpoint.name).not.toBe("Hijacked Endpoint by User B");
      expect(verifyEndpoint.url).toBe("https://example.com/webhook");
      expect(verifyEndpoint.url).not.toBe("https://attacker.com/steal-data");
    });
  });

  describe("dELETE /api/jobs/:jobId/endpoints/:id", () => {
    test("returns 404 when User B tries to delete User A's endpoint", async ({ tx }) => {
      const { appUserA, appUserB, job, endpoint } = await setupCrossUserEndpointScenario(tx);

      // Verify the endpoint exists before the delete attempt (User A can access it)
      const originalRes = await appUserA.request(`/api/jobs/${job.id}/endpoints/${endpoint.id}`, {
        method: "GET",
      });
      expect(originalRes.status).toBe(200);
      const originalEndpoint = await getJson(originalRes);
      expect(originalEndpoint.name).toBe("User A's Private Endpoint");

      // User B attempts to delete User A's endpoint
      const res = await appUserB.request(`/api/jobs/${job.id}/endpoints/${endpoint.id}`, {
        method: "DELETE",
      });

      // Should receive 404 (not 403 to avoid leaking existence of resource)
      expect(res.status).toBe(404);

      // Verify no data leakage in response body
      const data = await getJson(res);
      expect(data).not.toHaveProperty("name");
      expect(data).not.toHaveProperty("url");
      expect(data).not.toHaveProperty("method");
      expect(data).not.toHaveProperty("baselineCron");

      // Verify the endpoint was NOT deleted (User A can still access it)
      const verifyRes = await appUserA.request(`/api/jobs/${job.id}/endpoints/${endpoint.id}`, {
        method: "GET",
      });
      expect(verifyRes.status).toBe(200);
      const verifyEndpoint = await getJson(verifyRes);
      expect(verifyEndpoint.name).toBe("User A's Private Endpoint");
    });
  });

  // ==================== Run Routes ====================

  describe("gET /api/endpoints/:id/runs", () => {
    test("returns empty results when User B tries to list User A's endpoint runs", async ({ tx }) => {
      const { appUserA, appUserB, endpoint } = await setupCrossUserEndpointScenario(tx);

      // Create a run for User A's endpoint directly in the database
      const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await tx.insert(schema.runs).values({
        id: runId,
        endpointId: endpoint.id,
        status: "success",
        attempt: 1,
        source: "baseline",
        startedAt: new Date(),
        finishedAt: new Date(),
        durationMs: 150,
        statusCode: 200,
      });

      // Verify User A can list their own endpoint's runs and sees the run
      const ownerRes = await appUserA.request(`/api/endpoints/${endpoint.id}/runs`, {
        method: "GET",
      });
      expect(ownerRes.status).toBe(200);
      const ownerData = await getJson(ownerRes);
      expect(ownerData).toHaveProperty("runs");
      expect(Array.isArray(ownerData.runs)).toBe(true);
      expect(ownerData.runs.length).toBeGreaterThan(0);

      // User B attempts to list User A's endpoint runs
      // Should receive 200 but with empty results (filtered by userId)
      const res = await appUserB.request(`/api/endpoints/${endpoint.id}/runs`, {
        method: "GET",
      });
      expect(res.status).toBe(200);

      // Verify no data leakage - User B gets empty results
      const data = await getJson(res);
      expect(data).toHaveProperty("runs");
      expect(data.runs).toHaveLength(0);
      expect(data.total).toBe(0);
    });
  });

  describe("gET /api/runs/:id", () => {
    test("returns 404 when User B tries to access User A's run details", async ({ tx }) => {
      const { appUserA, appUserB, endpoint } = await setupCrossUserEndpointScenario(tx);

      // Create a run directly in the database for User A's endpoint
      const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await tx.insert(schema.runs).values({
        id: runId,
        endpointId: endpoint.id,
        status: "success",
        attempt: 1,
        source: "baseline",
        startedAt: new Date(),
        finishedAt: new Date(),
        durationMs: 150,
        statusCode: 200,
      });

      // Verify User A can access their own run
      const ownerRes = await appUserA.request(`/api/runs/${runId}`, {
        method: "GET",
      });
      expect(ownerRes.status).toBe(200);
      const ownerData = await getJson(ownerRes);
      expect(ownerData.id).toBe(runId);
      expect(ownerData.endpointId).toBe(endpoint.id);

      // User B attempts to access User A's run
      const res = await appUserB.request(`/api/runs/${runId}`, {
        method: "GET",
      });

      // Should receive 404 (not 403 to avoid leaking existence of resource)
      expect(res.status).toBe(404);

      // Verify no data leakage in response body
      const data = await getJson(res);
      expect(data).not.toHaveProperty("endpointId");
      expect(data).not.toHaveProperty("status");
      expect(data).not.toHaveProperty("durationMs");
      expect(data).not.toHaveProperty("statusCode");
      // The response should be an error object, not run data
      expect(data.id).not.toBe(runId);
    });
  });
});
