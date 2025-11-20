#!/usr/bin/env node
/**
 * Database migration composition root.
 * Wires DATABASE_URL and BETTER_AUTH_SECRET from environment into pure migration logic.
 */

import { runMigrations } from "@cronicorn/adapter-drizzle";
import { DEV_AUTH, DEV_DATABASE } from "@cronicorn/config-defaults";

async function main() {
  // eslint-disable-next-line node/no-process-env
  const databaseUrl = process.env.DATABASE_URL || DEV_DATABASE.URL;
  // eslint-disable-next-line node/no-process-env
  const encryptionSecret = process.env.BETTER_AUTH_SECRET || DEV_AUTH.SECRET;

  try {
    await runMigrations({
      connectionString: databaseUrl,
      encryptionSecret,
    });
    process.exit(0);
  }
  catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();
