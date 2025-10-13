import type { TransactionProvider } from "@cronicorn/services";

import { schema } from "@cronicorn/adapter-drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import type { Env } from "./config";

export function createDatabase(config: Env) {
  const pool = new Pool({
    connectionString: config.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
  });

  return drizzle(pool, { schema });
}

export type Database = ReturnType<typeof createDatabase>;

/**
 * Adapt Database to TransactionProvider interface.
 * This allows the manager to work with our Drizzle database.
 */
export function createTransactionProvider(db: Database): TransactionProvider {
  return {
    transaction: async <T>(fn: (tx: unknown) => Promise<T>) => db.transaction(fn),
  };
}
