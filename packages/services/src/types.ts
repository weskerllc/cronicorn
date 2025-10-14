import type { JsonValue } from "@cronicorn/domain";

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
 * Transaction context provided to operations within a transaction.
 *
 * This is intentionally minimal - just enough for repositories to work.
 * Concrete implementations (Drizzle, Prisma) will provide richer APIs.
 */
export type TransactionContext = unknown;

/**
 * @deprecated Use CreateEndpointInput from manager-v2 instead
 * Input for creating a new endpoint (legacy from v1).
 *
 * This is a plain TypeScript type (not a Zod schema or domain entity).
 * - API layer maps HTTP DTOs → CreateEndpointInput
 * - MCP layer maps tool parameters → CreateEndpointInput
 * - CLI layer maps command args → CreateEndpointInput
 */
export type CreateEndpointInputV1 = {
  name: string;
  baselineCron?: string;
  baselineIntervalMs?: number;
  minIntervalMs?: number;
  maxIntervalMs?: number;
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headersJson?: Record<string, string>;
  bodyJson?: JsonValue;
  timeoutMs?: number;
};
