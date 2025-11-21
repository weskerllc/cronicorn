-- Add dynamic body template fields to job_endpoints
ALTER TABLE "job_endpoints" ADD COLUMN "body_template" jsonb;
ALTER TABLE "job_endpoints" ADD COLUMN "body_template_schema" jsonb;

-- Add AI hints for resolved body values
ALTER TABLE "job_endpoints" ADD COLUMN "ai_hint_body_resolved" jsonb;
ALTER TABLE "job_endpoints" ADD COLUMN "ai_hint_body_expires_at" timestamp;
ALTER TABLE "job_endpoints" ADD COLUMN "ai_hint_body_reason" text;
