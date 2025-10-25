/**
 * Database type definitions for adapter-drizzle.
 *
 * Provides strongly-typed database instances for:
 * - NodePgDatabase: Standard database connections
 * - NodePgTransaction: Transaction-scoped database operations
 *
 * Both types include the full schema for type-safe queries.
 */

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "./schema.js";

/**
 * Type alias for a node-postgres database instance with our schema.
 * Use this for standard database connections (e.g., migrations, queries).
 */
export type AppDb = NodePgDatabase<typeof schema>;

/**
 * Schema export for external consumers who need table definitions.
 */
export { schema };
