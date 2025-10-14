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

// TODO we can define transaction context / provider with stronger types using drizzle adapter
/**
 * Transaction context provided to operations within a transaction.
 *
 * This is intentionally minimal - just enough for repositories to work.
 * Concrete implementations (Drizzle, Prisma) will provide richer APIs.
 */
export type TransactionContext = unknown;

/**
 * Abstract interface for database transaction management.
 *
 * This abstraction allows services to work with any database implementation
 * without coupling to specific ORM or database details.
 *
 * Implementations:
 * - Drizzle ORM (current)
 * - Prisma (future)
 * - Custom SQL (future)
 */
export type TransactionProvider = {
  /**
   * Execute operations within a database transaction.
   *
   * The transaction will:
   * - Commit if the callback completes successfully
   * - Rollback if the callback throws an error
   *
   * @param fn - Callback that receives transaction context
   * @returns Result from the callback
   */
  transaction: <T>(fn: (tx: TransactionContext) => Promise<T>) => Promise<T>;
};

/**
 * Adapt Database to TransactionProvider interface.
 * This allows the manager to work with our Drizzle database.
 */
export function createTransactionProvider(db: Database): TransactionProvider {
  return {
    transaction: async <T>(fn: (tx: unknown) => Promise<T>) => db.transaction(fn),
  };
}
