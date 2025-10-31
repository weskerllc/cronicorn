CREATE TYPE "public"."job_status" AS ENUM('active', 'paused', 'archived');--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "status" SET DATA TYPE job_status USING status::job_status;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "status" SET DEFAULT 'active'::job_status;