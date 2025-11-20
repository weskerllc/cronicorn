-- Migration: Secure header storage with encryption
-- 
-- IMPORTANT: This migration requires BETTER_AUTH_SECRET environment variable
-- for encrypting existing header data.
--
-- This migration ONLY adds the headers_encrypted column.
-- The data migration and column drop happen in the custom migration hook
-- to ensure proper ordering: add column → migrate data → drop old column
--
-- For existing deployments with data, ensure BETTER_AUTH_SECRET is set
-- before running this migration.

-- Step 1: Add new encrypted column
ALTER TABLE "job_endpoints" ADD COLUMN "headers_encrypted" text;

--> statement-breakpoint

-- Step 2: Data migration happens via custom hook in migrate.ts
-- (Cannot be done in SQL as it requires Node.js crypto for encryption)
--
-- Step 3: Old headers_json column drop also handled by custom hook
-- to ensure it happens AFTER data migration