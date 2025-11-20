-- Migration: Secure header storage with encryption
-- 
-- IMPORTANT: This migration requires BETTER_AUTH_SECRET environment variable
-- for encrypting existing header data. The migration will:
-- 1. Add headers_encrypted column
-- 2. Migrate existing data (if any) - handled by custom migration hook
-- 3. Drop old headers_json column
--
-- For existing deployments with data, ensure BETTER_AUTH_SECRET is set
-- before running this migration.

-- Step 1: Add new encrypted column
ALTER TABLE "job_endpoints" ADD COLUMN "headers_encrypted" text;

--> statement-breakpoint

-- Step 2: Data migration happens via custom hook in migrate.ts
-- (Cannot be done in SQL as it requires Node.js crypto for encryption)

--> statement-breakpoint

-- Step 3: Drop old plaintext column
ALTER TABLE "job_endpoints" DROP COLUMN "headers_json";