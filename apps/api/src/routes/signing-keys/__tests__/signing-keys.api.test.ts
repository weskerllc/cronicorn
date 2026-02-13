import { afterAll, describe } from "vitest";

import type { Env } from "../../../lib/config.js";

import { createApp } from "../../../app.js";
import { closeTestPool, createTestUser, expect, test } from "../../../lib/__tests__/fixtures.js";
import { createMockAuth, createMockSession } from "../../../lib/__tests__/test-helpers.js";

/**
 * API integration tests for signing key routes.
 *
 * Tests the full HTTP request/response cycle for:
 * - GET /api/signing-keys
 * - POST /api/signing-keys
 * - POST /api/signing-keys/rotate
 */

// eslint-disable-next-line ts/no-explicit-any
const getJson = async (res: Response): Promise<any> => await res.json();

const mockUserId = "test-user-signing-keys";
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

describe("signing-keys API", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  describe("get /api/signing-keys", () => {
    test("returns no key for new user", async ({ tx }) => {
      await createTestUser(tx, { id: mockUserId });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const { app } = await createApp(tx, testConfig, mockAuth, { useTransactions: false });

      const res = await app.request("/api/signing-keys", { method: "GET" });

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data.hasKey).toBe(false);
      expect(data.keyPrefix).toBeNull();
      expect(data.createdAt).toBeNull();
      expect(data.rotatedAt).toBeNull();
    });

    test("returns key info after creation", async ({ tx }) => {
      await createTestUser(tx, { id: mockUserId });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const { app } = await createApp(tx, testConfig, mockAuth, { useTransactions: false });

      // Create a key first
      await app.request("/api/signing-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const res = await app.request("/api/signing-keys", { method: "GET" });

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data.hasKey).toBe(true);
      expect(data.keyPrefix).toEqual(expect.any(String));
      expect(data.createdAt).toEqual(expect.any(String));
    });
  });

  describe("post /api/signing-keys", () => {
    test("creates signing key for user without one", async ({ tx }) => {
      await createTestUser(tx, { id: mockUserId });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const { app } = await createApp(tx, testConfig, mockAuth, { useTransactions: false });

      const res = await app.request("/api/signing-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(201);
      const data = await getJson(res);
      expect(data.rawKey).toEqual(expect.any(String));
    });

    test("returns 409 when key already exists", async ({ tx }) => {
      await createTestUser(tx, { id: mockUserId });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const { app } = await createApp(tx, testConfig, mockAuth, { useTransactions: false });

      // Create key first
      await app.request("/api/signing-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      // Try to create again
      const res = await app.request("/api/signing-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(409);
      const data = await getJson(res);
      expect(data.message).toContain("already exists");
    });
  });

  describe("post /api/signing-keys/rotate", () => {
    test("rotates existing key", async ({ tx }) => {
      await createTestUser(tx, { id: mockUserId });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const { app } = await createApp(tx, testConfig, mockAuth, { useTransactions: false });

      // Create key first
      const createRes = await app.request("/api/signing-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const createData = await getJson(createRes);

      // Rotate
      const res = await app.request("/api/signing-keys/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data.rawKey).toEqual(expect.any(String));
      // New key should be different from original
      expect(data.rawKey).not.toBe(createData.rawKey);
    });

    test("returns 404 when no key exists", async ({ tx }) => {
      await createTestUser(tx, { id: mockUserId });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const { app } = await createApp(tx, testConfig, mockAuth, { useTransactions: false });

      const res = await app.request("/api/signing-keys/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(404);
      const data = await getJson(res);
      expect(data.message).toContain("No signing key exists");
    });
  });

  describe("cross-user isolation", () => {
    test("user cannot see another user's key", async ({ tx }) => {
      const user1Id = "signing-key-user-1";
      const user2Id = "signing-key-user-2";
      await createTestUser(tx, { id: user1Id, email: "user1@test.com" });
      await createTestUser(tx, { id: user2Id, email: "user2@test.com" });

      // User 1 creates a key
      const mockAuth1 = createMockAuth(createMockSession(user1Id));
      const { app: app1 } = await createApp(tx, testConfig, mockAuth1, { useTransactions: false });
      await app1.request("/api/signing-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      // User 2 checks — should see no key
      const mockAuth2 = createMockAuth(createMockSession(user2Id));
      const { app: app2 } = await createApp(tx, testConfig, mockAuth2, { useTransactions: false });
      const res = await app2.request("/api/signing-keys", { method: "GET" });

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data.hasKey).toBe(false);
    });
  });
});
