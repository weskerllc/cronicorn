import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

/**
 * Test database utilities for contract tests.
 *
 * Provides transaction-per-test pattern for isolation.
 */

export type TestTransaction = PgTransaction<PostgresJsQueryResultHKT, Record<string, never>>;

/**
 * Create a test database connection.
 * Requires DATABASE_URL environment variable.
 */
export function createTestDb() {
  // eslint-disable-next-line node/no-process-env
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable required for DB tests");
  }

  const client = postgres(DATABASE_URL);
  return drizzle(client);
}

/**
 * Run a test in a transaction that rolls back automatically.
 */
export async function withTransaction<T>(
  db: ReturnType<typeof drizzle>,
  fn: (tx: TestTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    // eslint-disable-next-line ts/consistent-type-assertions
    const result = await fn(tx as TestTransaction);
    // Rollback happens automatically if we throw
    throw new RollbackSignal(result);
  }).catch((err) => {
    if (err instanceof RollbackSignal) {
      return err.result;
    }
    throw err;
  });
}

/**
 * Internal signal to trigger transaction rollback with result.
 */
class RollbackSignal<T> extends Error {
  constructor(public result: T) {
    super("Transaction rollback for test isolation");
  }
}
