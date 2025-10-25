ALTER TABLE "job_endpoints" ADD COLUMN "max_response_size_kb" integer;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "response_body" jsonb;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "status_code" integer;