import { schema } from "@cronicorn/adapter-drizzle";
import { afterAll, describe } from "vitest";

import type { Env } from "../../../lib/config.js";

import { createApp } from "../../../app.js";
import { closeTestPool, createTestUser, expect, test } from "../../../lib/__tests__/fixtures.js";
import { createMockAuth, createMockSession } from "../../../lib/__tests__/test-helpers.js";

/**
 * API integration tests for devices routes.
 *
 * Tests the full HTTP request/response cycle for:
 * - GET /api/devices
 * - DELETE /api/devices/:tokenId
 *
 * NOTE: Uses unique user IDs per test because the devices handler creates
 * nested transactions via db.transaction() which may commit independently.
 */

// eslint-disable-next-line ts/no-explicit-any
const getJson = async (res: Response): Promise<any> => await res.json();

let testCounter = 0;
function uniqueUserId() {
  return `dev-user-${Date.now()}-${++testCounter}`;
}

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
  SHUTDOWN_TIMEOUT_MS: 30000,
};

/**
 * Create a session record directly in the database.
 */
// eslint-disable-next-line ts/no-explicit-any
async function createTestSession(tx: any, overrides: {
  id: string;
  userId: string;
  token?: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  await tx.insert(schema.session).values({
    id: overrides.id,
    userId: overrides.userId,
    token: overrides.token ?? `token-${overrides.id}`,
    userAgent: overrides.userAgent ?? "Test Agent",
    ipAddress: overrides.ipAddress ?? "127.0.0.1",
    createdAt: now,
    expiresAt,
    updatedAt: now,
  });
}

describe("devices API", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  describe("get /api/devices", () => {
    test("returns empty list for user with no sessions", async ({ tx }) => {
      const userId = uniqueUserId();
      await createTestUser(tx, { id: userId });

      const mockSession = createMockSession(userId);
      const mockAuth = createMockAuth(mockSession);
      const { app } = await createApp(tx, testConfig, mockAuth, { useTransactions: false });

      const res = await app.request("/api/devices", { method: "GET" });

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data.devices).toEqual([]);
    });

    test("returns connected devices for user", async ({ tx }) => {
      const userId = uniqueUserId();
      await createTestUser(tx, { id: userId });
      await createTestSession(tx, { id: `sess-list-1-${userId}`, userId, userAgent: "Chrome" });
      await createTestSession(tx, { id: `sess-list-2-${userId}`, userId, userAgent: "Firefox" });

      const mockSession = createMockSession(userId);
      const mockAuth = createMockAuth(mockSession);
      const { app } = await createApp(tx, testConfig, mockAuth, { useTransactions: false });

      const res = await app.request("/api/devices", { method: "GET" });

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data.devices).toHaveLength(2);
      expect(data.devices[0]).toMatchObject({
        id: expect.any(String),
        token: expect.any(String),
        createdAt: expect.any(String),
        expiresAt: expect.any(String),
      });
    });
  });

  describe("delete /api/devices/:tokenId", () => {
    test("revokes existing session belonging to user", async ({ tx }) => {
      const userId = uniqueUserId();
      const sessionId = `sess-revoke-${userId}`;
      await createTestUser(tx, { id: userId });
      await createTestSession(tx, { id: sessionId, userId });

      const mockSession = createMockSession(userId);
      const mockAuth = createMockAuth(mockSession);
      const { app } = await createApp(tx, testConfig, mockAuth, { useTransactions: false });

      const res = await app.request(`/api/devices/${sessionId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "Origin": "http://localhost:5173" },
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data.success).toBe(true);
    });

    test("returns 404 for non-existent session", async ({ tx }) => {
      const userId = uniqueUserId();
      await createTestUser(tx, { id: userId });

      const mockSession = createMockSession(userId);
      const mockAuth = createMockAuth(mockSession);
      const { app } = await createApp(tx, testConfig, mockAuth, { useTransactions: false });

      const res = await app.request("/api/devices/nonexistent-session-id", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "Origin": "http://localhost:5173" },
      });

      expect(res.status).toBe(404);
      const data = await getJson(res);
      expect(data.success).toBe(false);
    });

    test("returns 403 when trying to revoke another user's session", async ({ tx }) => {
      const userId = uniqueUserId();
      const otherUserId = uniqueUserId();
      const otherSessionId = `sess-other-${otherUserId}`;
      await createTestUser(tx, { id: userId, email: `${userId}@test.com` });
      await createTestUser(tx, { id: otherUserId, email: `${otherUserId}@test.com` });
      await createTestSession(tx, { id: otherSessionId, userId: otherUserId });

      const mockSession = createMockSession(userId);
      const mockAuth = createMockAuth(mockSession);
      const { app } = await createApp(tx, testConfig, mockAuth, { useTransactions: false });

      const res = await app.request(`/api/devices/${otherSessionId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "Origin": "http://localhost:5173" },
      });

      expect(res.status).toBe(403);
      const data = await getJson(res);
      expect(data.success).toBe(false);
    });
  });
});
