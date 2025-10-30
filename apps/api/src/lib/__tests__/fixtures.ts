import { schema } from "@cronicorn/adapter-drizzle";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { test as base } from "vitest";

type Fixtures = {
    tx: NodePgDatabase<typeof schema>;
};

// eslint-disable-next-line node/no-process-env
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required for tests");
}

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
// eslint-disable-next-line test/consistent-test-it
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
