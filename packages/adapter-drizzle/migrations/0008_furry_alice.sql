CREATE TYPE "public"."job_status" AS ENUM('active', 'paused', 'archived');--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "status" SET DATA TYPE job_status;