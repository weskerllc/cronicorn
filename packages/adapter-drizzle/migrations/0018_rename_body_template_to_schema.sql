-- Rename body_template to body_schema (simplification - no template syntax, just JSON Schema)
-- The body_template column was for template strings with {{...}} syntax
-- The body_schema column is for JSON Schema that AI uses to generate bodies

-- Drop the body_template column (was for template syntax, no longer used)
ALTER TABLE "job_endpoints" DROP COLUMN IF EXISTS "body_template";

-- Rename body_template_schema to body_schema (it was always meant to be the schema)
ALTER TABLE "job_endpoints" RENAME COLUMN "body_template_schema" TO "body_schema";
