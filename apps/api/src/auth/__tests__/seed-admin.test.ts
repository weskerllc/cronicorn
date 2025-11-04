import { afterAll, describe } from "vitest";

import type { Env } from "../../lib/config.js";

import { createAuth } from "../config.js";
import { seedAdminUser } from "../seed-admin.js";
import { closeTestPool, expect, test } from "../../lib/__tests__/fixtures.js";
import { sql } from "drizzle-orm";
import { schema } from "@cronicorn/adapter-drizzle";

/**
 * Integration tests for admin user seeding functionality.
 *
 * Tests that admin users are correctly created when ADMIN_USER_EMAIL
 * and ADMIN_USER_PASSWORD environment variables are set.
 */

const testConfig: Env = {
  NODE_ENV: "test",
  PORT: 3000,
  DATABASE_URL: "postgres://test",
  API_URL: "http://localhost:3000",
  WEB_URL: "http://localhost:5173",
  BETTER_AUTH_SECRET: "test-secret-must-be-at-least-32-characters-long",
  BETTER_AUTH_URL: "http://localhost:3000/api/auth",
  ADMIN_USER_EMAIL: "admin@example.com",
  ADMIN_USER_PASSWORD: "test-password-123",
  ADMIN_USER_NAME: "Test Admin",
  STRIPE_SECRET_KEY: "sk_test_fake_key_for_testing",
  STRIPE_WEBHOOK_SECRET: "whsec_test_fake_secret",
  STRIPE_PRICE_PRO: "price_test_pro",
  STRIPE_PRICE_ENTERPRISE: "price_test_enterprise",
  BASE_URL: "http://localhost:5173",
};

describe("seedAdminUser", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  test("creates admin user when configured", async ({ tx }) => {
    const auth = createAuth(testConfig, tx);

    // Seed the admin user
    await seedAdminUser(testConfig, tx, auth);

    // Verify user was created
    const result = await tx.execute(
      sql`SELECT email, name FROM ${schema.user} WHERE email = ${testConfig.ADMIN_USER_EMAIL}`
    );

    expect(result.rows.length).toBe(1);
    expect(result.rows[0]).toMatchObject({
      email: testConfig.ADMIN_USER_EMAIL,
      name: testConfig.ADMIN_USER_NAME,
    });
  });

  test("does not duplicate admin user on subsequent calls", async ({ tx }) => {
    const auth = createAuth(testConfig, tx);

    // Seed twice
    await seedAdminUser(testConfig, tx, auth);
    await seedAdminUser(testConfig, tx, auth);

    // Verify only one user exists
    const result = await tx.execute(
      sql`SELECT COUNT(*) as count FROM ${schema.user} WHERE email = ${testConfig.ADMIN_USER_EMAIL}`
    );

    expect(result.rows[0].count).toBe("1");
  });

  test("skips seeding when admin credentials not configured", async ({ tx }) => {
    const noAdminConfig: Env = {
      ...testConfig,
      ADMIN_USER_EMAIL: undefined,
      ADMIN_USER_PASSWORD: undefined,
      GITHUB_CLIENT_ID: "test_client_id",
      GITHUB_CLIENT_SECRET: "test_client_secret",
    };

    const auth = createAuth(noAdminConfig, tx);

    // Should not throw and should skip seeding
    await expect(seedAdminUser(noAdminConfig, tx, auth)).resolves.toBeUndefined();

    // Verify no user was created
    const result = await tx.execute(
      sql`SELECT COUNT(*) as count FROM ${schema.user}`
    );

    expect(result.rows[0].count).toBe("0");
  });

  test("allows login with created admin user", async ({ tx }) => {
    const auth = createAuth(testConfig, tx);

    // Seed the admin user
    await seedAdminUser(testConfig, tx, auth);

    // Try to sign in with the admin credentials
    const signInResult = await auth.api.signInEmail({
      body: {
        email: testConfig.ADMIN_USER_EMAIL!,
        password: testConfig.ADMIN_USER_PASSWORD!,
      },
    });

    // Better Auth returns a response with session info
    expect(signInResult).toBeDefined();
  });
});
