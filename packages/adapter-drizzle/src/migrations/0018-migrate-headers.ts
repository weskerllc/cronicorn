/**
 * Custom migration for 0018: Encrypt existing headers
 * 
 * This runs as part of the migration process, after the schema changes
 * but within the same transaction context.
 */

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { isNotNull, sql } from "drizzle-orm";
import { encryptHeaders } from "../crypto.js";
import { jobEndpoints } from "../schema.js";

export async function migrateHeaders(
  // eslint-disable-next-line ts/no-explicit-any
  db: NodePgDatabase<any>,
  secret?: string,
): Promise<void> {
  // Check if encryption secret is available
  if (!secret || secret.length < 32) {
    // eslint-disable-next-line no-console
    console.log("⚠️  No encryption secret provided - skipping header data migration");
    // eslint-disable-next-line no-console
    console.log("   Set BETTER_AUTH_SECRET environment variable if you have existing header data");
    return;
  }

  // Check if headers_json column still exists (migration might have already run)
  const columnsResult = await db.execute(sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'job_endpoints' AND column_name = 'headers_json'
  `);

  if (columnsResult.rows.length === 0) {
    // eslint-disable-next-line no-console
    console.log("✓ headers_json column already removed - migration complete");
    return;
  }

  // eslint-disable-next-line no-console
  console.log("🔄 Migrating existing plaintext headers to encrypted format...");

  // Find all endpoints with non-null headers_json
  const endpointsWithHeaders = await db
    .select({
      id: jobEndpoints.id,
      headersJson: sql<Record<string, string> | null>`headers_json`,
    })
    .from(jobEndpoints)
    .where(isNotNull(sql`headers_json`));

  if (endpointsWithHeaders.length === 0) {
    // eslint-disable-next-line no-console
    console.log("✓ No endpoints with plaintext headers found");
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`  Found ${endpointsWithHeaders.length} endpoints with headers to migrate`);

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
    }
    catch (error) {
      failed++;
      console.error(`  ✗ Failed to migrate endpoint ${endpoint.id}:`, error);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`✓ Header migration complete: ${migrated} migrated, ${failed} failed`);
}
