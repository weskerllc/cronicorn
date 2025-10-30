import { schema } from "@cronicorn/adapter-drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import type { Database } from "../db.js";

/**
 * Creates a test database connection for integration tests.
 *
 * @deprecated Use the transactional fixture pattern from `./fixtures.ts` instead.
 * This function creates a database connection but does NOT provide transaction isolation,
 * which means tests can pollute the database. The fixture pattern automatically wraps
 * each test in BEGIN/ROLLBACK for perfect isolation.
 *
 * Example migration:
 * ```ts
 * // Old pattern (deprecated):
 * beforeEach(async () => {
 *   const testDb = await createTestDatabase();
 *   db = testDb.db;
 * });
 *
 * // New pattern (recommended):
 * import { test, expect, closeTestPool } from "../lib/__tests__/fixtures.js";
 * test("my test", async ({ tx }) => {
 *   const app = await createApp(tx, testConfig, mockAuth);
 *   // ... test code runs in transaction, auto-rollback after
 * });
 * ```
 *
 * Uses DATABASE_URL from environment (should be loaded by vitest from .env.test).
 * Returns a database instance and cleanup function.
 */
export async function createTestDatabase(): Promise<{
  db: Database;
  cleanup: () => Promise<void>;
}> {
  // eslint-disable-next-line node/no-process-env
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required for tests");
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  const db = drizzle(pool, { schema });

  const cleanup = async () => {
    await pool.end();
  };

  return { db, cleanup };
}

/**
 * Creates a mock user session for testing authenticated endpoints.
 *
 * Bypasses Better Auth middleware by injecting a session object directly into Hono context.
 * Use with middleware injection pattern in tests.
 */
export function createMockSession(userId: string, email = "test@example.com", name = "Test User") {
  return {
    user: {
      id: userId,
      email,
      name,
    },
    session: {
      id: `test-session-${userId}`,
      userId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    },
  };
}

/**
 * Creates a mock Better Auth instance for testing.
 *
 * Returns a mock that always validates with the provided session.
 */
// eslint-disable-next-line ts/no-explicit-any
export function createMockAuth(mockSession: ReturnType<typeof createMockSession>): any {
  return {
    api: {
      getSession: async () => mockSession,
      verifyApiKey: async () => ({ valid: false }), // API key auth disabled in tests
    },
    handler: async () => new Response("Mock auth handler"),
  };
}
