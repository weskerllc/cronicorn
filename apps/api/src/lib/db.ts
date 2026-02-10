import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { schema } from "@cronicorn/adapter-drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import type { Env } from "./config";

export function createDatabase(config: Env) {
  const pool = new Pool({
    connectionString: config.DATABASE_URL,
    max: config.DB_POOL_MAX,
    idleTimeoutMillis: config.DB_POOL_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: config.DB_POOL_CONNECTION_TIMEOUT_MS,
  });

  return drizzle(pool, { schema });
}

// export type Database = ReturnType<typeof createDatabase>;
export type Database = NodePgDatabase<typeof schema>;
