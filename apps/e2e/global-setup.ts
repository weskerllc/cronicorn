/**
 * Playwright Global Setup
 *
 * Runs before all tests to ensure the database is in a known state.
 * This script:
 * 1. Resets the database (drops and recreates)
 * 2. Runs migrations
 * 3. Seeds demo data (including admin user)
 *
 * Note: This assumes Docker (for PostgreSQL) is already running.
 * Start it with: pnpm db
 */

/* eslint-disable no-console */
/* eslint-disable node/no-process-env */

import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the repository root
const repoRoot = resolve(__dirname, "../..");

/**
 * Run a command and log output
 */
function runCommand(command: string, description: string): void {
  console.log(`\n🔄 ${description}...`);
  try {
    execSync(command, {
      cwd: repoRoot,
      stdio: "inherit",
      env: { ...process.env },
    });
    console.log(`✅ ${description} complete`);
  }
  catch (error) {
    console.error(`❌ ${description} failed`);
    throw error;
  }
}

/**
 * Global setup function called by Playwright before all tests
 */
async function globalSetup(): Promise<void> {
  const separator = "=".repeat(60);
  console.log(`\n${separator}`);
  console.log("🧪 E2E Test Setup: Preparing database...");
  console.log(separator);

  // Reset database (drops and recreates via Docker)
  // Using db:reset which runs: docker compose down -v && pnpm db
  runCommand("pnpm db:reset", "Database reset");

  // Wait a moment for PostgreSQL to be fully ready
  console.log("\n⏳ Waiting for database to be ready...");
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Run migrations
  runCommand("pnpm db:migrate", "Database migrations");

  // Seed demo data (creates admin user + sample jobs/endpoints/runs)
  runCommand("pnpm db:seed", "Database seeding");

  console.log(`\n${separator}`);
  console.log("✅ E2E Test Setup Complete!");
  console.log(`${separator}\n`);
}

export default globalSetup;
