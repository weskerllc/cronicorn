import { afterAll, describe } from "vitest";

import type { Env } from "../../../lib/config.js";

import { createApp } from "../../../app.js";
import { closeTestPool, createTestUser, expect, test } from "../../../lib/__tests__/fixtures.js";
import { createMockAuth, createMockSession } from "../../../lib/__tests__/test-helpers.js";

/**
 * API integration tests for dashboard routes.
 *
 * Tests the full HTTP request/response cycle for:
 * - GET /api/dashboard/stats
 * - GET /api/dashboard/activity
 */

// eslint-disable-next-line ts/no-explicit-any
const getJson = async (res: Response): Promise<any> => await res.json();

const mockUserId = "test-user-dashboard";
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

describe("dashboard API", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  describe("get /api/dashboard/stats", () => {
    test("returns dashboard stats for user with no data", async ({ tx }) => {
      await createTestUser(tx, { id: mockUserId });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const { app } = await createApp(tx, testConfig, mockAuth, { useTransactions: false });

      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const res = await app.request(
        `/api/dashboard/stats?startDate=${startDate}&endDate=${endDate}`,
        { method: "GET" },
      );

      expect(res.status).toBe(200);
      const data = await getJson(res);

      expect(data).toMatchObject({
        jobs: { total: expect.any(Number) },
        endpoints: { total: expect.any(Number), active: expect.any(Number), paused: expect.any(Number) },
        successRate: { overall: expect.any(Number), trend: expect.any(String) },
        recentActivity: { runs24h: expect.any(Number) },
      });
      expect(Array.isArray(data.runTimeSeries)).toBe(true);
      expect(Array.isArray(data.endpointTimeSeries)).toBe(true);
      expect(Array.isArray(data.aiSessionTimeSeries)).toBe(true);
    });

    test("returns stats filtered by jobId", async ({ tx }) => {
      await createTestUser(tx, { id: mockUserId });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const { app } = await createApp(tx, testConfig, mockAuth, { useTransactions: false });

      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const res = await app.request(
        `/api/dashboard/stats?startDate=${startDate}&endDate=${endDate}&jobId=nonexistent-job`,
        { method: "GET" },
      );

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data.runTimeSeries).toBeDefined();
    });
  });

  describe("get /api/dashboard/activity", () => {
    test("returns activity timeline with no data", async ({ tx }) => {
      await createTestUser(tx, { id: mockUserId });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const { app } = await createApp(tx, testConfig, mockAuth, { useTransactions: false });

      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const res = await app.request(
        `/api/dashboard/activity?startDate=${startDate}&endDate=${endDate}`,
        { method: "GET" },
      );

      expect(res.status).toBe(200);
      const data = await getJson(res);

      expect(data).toMatchObject({
        events: [],
        total: 0,
        summary: {
          runsCount: 0,
          sessionsCount: 0,
          successRate: 0,
        },
      });
    });

    test("returns activity filtered by eventType runs", async ({ tx }) => {
      await createTestUser(tx, { id: mockUserId });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const { app } = await createApp(tx, testConfig, mockAuth, { useTransactions: false });

      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const res = await app.request(
        `/api/dashboard/activity?startDate=${startDate}&endDate=${endDate}&eventType=runs`,
        { method: "GET" },
      );

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data.events).toEqual([]);
      expect(data.summary.sessionsCount).toBe(0);
    });

    test("returns activity filtered by eventType sessions", async ({ tx }) => {
      await createTestUser(tx, { id: mockUserId });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const { app } = await createApp(tx, testConfig, mockAuth, { useTransactions: false });

      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const res = await app.request(
        `/api/dashboard/activity?startDate=${startDate}&endDate=${endDate}&eventType=sessions`,
        { method: "GET" },
      );

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data.events).toEqual([]);
      expect(data.summary.runsCount).toBe(0);
    });

    test("supports pagination with limit and offset", async ({ tx }) => {
      await createTestUser(tx, { id: mockUserId });

      const mockSession = createMockSession(mockUserId);
      const mockAuth = createMockAuth(mockSession);
      const { app } = await createApp(tx, testConfig, mockAuth, { useTransactions: false });

      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const res = await app.request(
        `/api/dashboard/activity?startDate=${startDate}&endDate=${endDate}&limit=10&offset=0`,
        { method: "GET" },
      );

      expect(res.status).toBe(200);
      const data = await getJson(res);
      expect(data.total).toBe(0);
    });
  });
});
