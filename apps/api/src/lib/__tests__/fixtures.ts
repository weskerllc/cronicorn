import { schema } from "@cronicorn/adapter-drizzle";
import { DEV_DATABASE } from "@cronicorn/config-defaults";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { it as base } from "vitest";

type Fixtures = {
  tx: NodePgDatabase<typeof schema>;
};

// eslint-disable-next-line node/no-process-env
const DATABASE_URL = process.env.DATABASE_URL || DEV_DATABASE.URL;

const pool = new Pool({ connectionString: DATABASE_URL });

/**
 * Extended Vitest test with transaction-per-test isolation.
 *
 * Each test gets a fresh `tx` fixture that:
 * 1. Opens a database connection from the pool
 * 2. Starts a transaction with BEGIN
 * 3. Runs your test with the transaction
 * 4. Rolls back the transaction (perfect test isolation)
 * 5. Releases the connection back to the pool
 *
 * Usage:
 * ```ts
 * test("my test", async ({ tx }) => {
 *   const app = await createApp(tx, testConfig, mockAuth);
 *   // ... test code ...
 * });
 * ```
 */
export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  tx: async ({ }, use) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const tx = drizzle(client, { schema });
      await use(tx); // <-- your test runs here with a tx
      await client.query("ROLLBACK"); // <-- isolation via rollback
    }
    finally {
      client.release();
    }
  },
});

// Re-export expect directly from vitest (NOT from `test`)
export { expect } from "vitest";

/**
 * Global teardown helper to close the connection pool.
 * Call this in afterAll or in a global test teardown.
 */
export async function closeTestPool() {
  await pool.end();
}

/**
 * Test factory for creating users in tests.
 * Required for foreign key constraints on jobs.userId.
 */
export async function createTestUser(tx: NodePgDatabase<typeof schema>, overrides?: Partial<typeof schema.user.$inferInsert>) {
  const defaultUser: typeof schema.user.$inferInsert = {
    id: overrides?.id || `user_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name: overrides?.name || "Test User",
    email: overrides?.email || `test${Date.now()}@example.com`,
    emailVerified: overrides?.emailVerified ?? false,
    createdAt: overrides?.createdAt || new Date(),
    updatedAt: overrides?.updatedAt || new Date(),
    tier: overrides?.tier || "free",
    isAnonymous: overrides?.isAnonymous || false,
    ...overrides,
  };

  // eslint-disable-next-line ts/no-explicit-any, ts/consistent-type-assertions
  const users = await (tx.insert(schema.user as any).values(defaultUser).returning());
  // @ts-expect-error Ignoring drizzle typing issue in test fixture
  if (!users[0])
    throw new Error("Failed to create test user");
  // @ts-expect-error Ignoring drizzle typing issue in test fixture
  return users[0];
}
