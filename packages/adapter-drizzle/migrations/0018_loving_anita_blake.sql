ALTER TABLE "job_endpoints" ADD COLUMN "headers_encrypted" text;--> statement-breakpoint
ALTER TABLE "job_endpoints" DROP COLUMN "headers_json";