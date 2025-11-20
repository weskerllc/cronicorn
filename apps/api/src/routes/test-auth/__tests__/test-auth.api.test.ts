import { afterAll, describe } from "vitest";

import type { Env } from "../../../lib/config.js";

import { createApp } from "../../../app.js";
import { closeTestPool, expect, test } from "../../../lib/__tests__/fixtures.js";
import { createAuth } from "../../../auth/config.js";

/**
 * Integration tests for test-auth endpoints
 * 
 * Verifies that:
 * 1. Test login endpoint works in development/test
 * 2. Test login endpoint is blocked in production
 * 3. Session cookies are properly set
 */

const testConfig: Env = {
  NODE_ENV: "test",
  PORT: 3000,
  DATABASE_URL: "postgres://test",
  API_URL: "http://localhost:3000",
  WEB_URL: "http://localhost:5173",
  BETTER_AUTH_SECRET: "test-secret-must-be-at-least-32-characters-long",
  BETTER_AUTH_URL: "http://localhost:3000",
  ADMIN_USER_EMAIL: "admin@example.com",
  ADMIN_USER_PASSWORD: "test-password-123",
  ADMIN_USER_NAME: "Admin User",
  STRIPE_SECRET_KEY: "sk_test_fake_key_for_testing",
  STRIPE_WEBHOOK_SECRET: "whsec_test_fake_secret",
  STRIPE_PRICE_PRO: "price_test_pro",
  STRIPE_PRICE_ENTERPRISE: "price_test_enterprise",
  BASE_URL: "http://localhost:5173",
};

const productionConfig: Env = {
  ...testConfig,
  NODE_ENV: "production",
};

describe("Test Auth - POST /test/auth/login", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  test("successfully creates session in test environment", async ({ tx }) => {
    const auth = createAuth(testConfig, tx);
    const { app } = await createApp(tx, testConfig, auth, { useTransactions: false });

    // First, seed the admin user
    await auth.api.signUpEmail({
      body: {
        email: testConfig.ADMIN_USER_EMAIL,
        password: testConfig.ADMIN_USER_PASSWORD,
        name: testConfig.ADMIN_USER_NAME,
      },
    });

    // Call test login endpoint
    const res = await app.request("/api/test/auth/login", {
      method: "POST",
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      success: true,
      message: expect.stringContaining("Test login successful"),
    });

    // Verify that cookies were set
    const setCookieHeader = res.headers.get("set-cookie");
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain("better-auth.session_token");
  });

  test("returns 403 in production environment", async ({ tx }) => {
    const auth = createAuth(productionConfig, tx);
    const { app } = await createApp(tx, productionConfig, auth, { useTransactions: false });

    const res = await app.request("/api/test/auth/login", {
      method: "POST",
    });

    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body).toMatchObject({
      error: expect.stringContaining("production"),
    });
  });

  test("returns 503 when admin user not configured", async ({ tx }) => {
    const noAdminConfig: Env = {
      ...testConfig,
      ADMIN_USER_EMAIL: "",
      ADMIN_USER_PASSWORD: "",
      GITHUB_CLIENT_ID: "fake_client_id",
      GITHUB_CLIENT_SECRET: "fake_client_secret",
    };

    const auth = createAuth(noAdminConfig, tx);
    const { app } = await createApp(tx, noAdminConfig, auth, { useTransactions: false });

    const res = await app.request("/api/test/auth/login", {
      method: "POST",
    });

    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body).toMatchObject({
      error: expect.stringContaining("not configured"),
    });
  });

  test("session allows access to protected endpoints", async ({ tx }) => {
    const auth = createAuth(testConfig, tx);
    const { app } = await createApp(tx, testConfig, auth, { useTransactions: false });

    // Seed the admin user
    await auth.api.signUpEmail({
      body: {
        email: testConfig.ADMIN_USER_EMAIL,
        password: testConfig.ADMIN_USER_PASSWORD,
        name: testConfig.ADMIN_USER_NAME,
      },
    });

    // Get session via test login
    const loginRes = await app.request("/api/test/auth/login", {
      method: "POST",
    });

    expect(loginRes.status).toBe(200);

    // Extract cookies from login response
    const cookies = loginRes.headers.get("set-cookie");
    expect(cookies).toBeDefined();

    // Try to access a protected endpoint with the session cookie
    const dashboardRes = await app.request("/api/dashboard", {
      method: "GET",
      headers: {
        Cookie: cookies || "",
      },
    });

    // Should be able to access protected endpoint
    expect(dashboardRes.status).not.toBe(401);
  });
});
