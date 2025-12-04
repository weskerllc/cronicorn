ALTER TABLE "ai_analysis_sessions" ADD COLUMN "next_analysis_at" timestamp;--> statement-breakpoint
ALTER TABLE "ai_analysis_sessions" ADD COLUMN "endpoint_failure_count" integer;