/**
 * Pure migration runner - no env var dependencies.
 * Called by composition roots (apps/migrator) with explicit config.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type MigrationConfig = {
  connectionString: string;
};

export async function runMigrations(config: MigrationConfig): Promise<void> {
  // eslint-disable-next-line no-console
  console.log("🔄 Connecting to database...");

  // Create pg client for migrations
  const migrationClient = new Client({ connectionString: config.connectionString });
  await migrationClient.connect();

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
    throw error;
  }
  finally {
    // Close the connection
    await migrationClient.end();
  }
}
