/**
 * One-time script to migrate existing plaintext headers to encrypted format.
 *
 * Run this BEFORE deploying the new code that removes headers_json column.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... BETTER_AUTH_SECRET=your-secret tsx scripts/migrate-headers.ts
 */

import { isNotNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { encryptHeaders } from "../src/crypto.js";
import { jobEndpoints } from "../src/schema.js";

async function migrateHeaders() {
  // eslint-disable-next-line node/no-process-env
  const databaseUrl = process.env.DATABASE_URL;
  // eslint-disable-next-line node/no-process-env
  const secret = process.env.BETTER_AUTH_SECRET;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET environment variable is required (min 32 characters)");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    // eslint-disable-next-line no-console
    console.log("🔍 Checking for endpoints with plaintext headers...");

    // First, check if headers_json column still exists
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'job_endpoints' AND column_name = 'headers_json'
    `);

    if (columnsResult.rows.length === 0) {
      // eslint-disable-next-line no-console
      console.log("✅ headers_json column no longer exists - migration already complete or not needed");
      return;
    }

    // Find all endpoints with non-null headers_json
    const endpointsWithHeaders = await db
      .select({
        id: jobEndpoints.id,
        headersJson: jobEndpoints.headersJson,
      })
      .from(jobEndpoints)
      .where(isNotNull(jobEndpoints.headersJson));

    if (endpointsWithHeaders.length === 0) {
      // eslint-disable-next-line no-console
      console.log("✅ No endpoints with plaintext headers found");
      return;
    }

    // eslint-disable-next-line no-console
    console.log(`📝 Found ${endpointsWithHeaders.length} endpoints with plaintext headers`);

    let migrated = 0;
    let failed = 0;

    for (const endpoint of endpointsWithHeaders) {
      try {
        if (!endpoint.headersJson || Object.keys(endpoint.headersJson).length === 0) {
          continue;
        }

        const encrypted = encryptHeaders(endpoint.headersJson, secret);

        await db
          .update(jobEndpoints)
          .set({ headersEncrypted: encrypted })
          .where(sql`id = ${endpoint.id}`);

        migrated++;
        // eslint-disable-next-line no-console
        console.log(`  ✓ Migrated endpoint ${endpoint.id}`);
      }
      catch (error) {
        failed++;
        console.error(`  ✗ Failed to migrate endpoint ${endpoint.id}:`, error);
      }
    }

    // eslint-disable-next-line no-console
    console.log(`\n✅ Migration complete: ${migrated} migrated, ${failed} failed`);
  }
  finally {
    await pool.end();
  }
}

migrateHeaders().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
