#!/usr/bin/env node
/**
 * Programmatic migration script for CI/CD environments.
 * Applies all pending migrations from the migrations folder.
 *
 * Usage:
 *   DATABASE_URL=<url> node --import tsx src/migrate.ts
 *   or
 *   DATABASE_URL=<url> pnpm db:migrate:apply
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    // eslint-disable-next-line node/no-process-env
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error("❌ DATABASE_URL environment variable is required");
        process.exit(1);
    }

    // eslint-disable-next-line no-console
    console.log("🔄 Connecting to database...");

    // Create postgres client with max: 1 for migrations
    const migrationClient = postgres(databaseUrl, { max: 1 });

    try {
        const db = drizzle(migrationClient);

        // eslint-disable-next-line no-console
        console.log("🚀 Running migrations...");

        // Resolve migrations folder path relative to this file
        const migrationsFolder = resolve(__dirname, "../migrations");

        await migrate(db, {
            migrationsFolder,
            migrationsTable: "__drizzle_migrations",
            migrationsSchema: "public",
        });

        // eslint-disable-next-line no-console
        console.log("✅ Migrations completed successfully");
    }
    catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
    finally {
        // Close the connection
        await migrationClient.end();
    }
}

main();
