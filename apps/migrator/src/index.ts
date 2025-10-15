#!/usr/bin/env node
/**
 * Database migration composition root.
 * Wires DATABASE_URL from environment into pure migration logic.
 */

import { runMigrations } from "@cronicorn/adapter-drizzle";

async function main() {
    // eslint-disable-next-line node/no-process-env
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error("❌ DATABASE_URL environment variable is required");
        process.exit(1);
    }

    try {
        await runMigrations({ connectionString: databaseUrl });
        process.exit(0);
    }
    catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

main();
