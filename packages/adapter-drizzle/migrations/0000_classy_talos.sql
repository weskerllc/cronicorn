CREATE TABLE "job_endpoints" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"baseline_cron" text,
	"baseline_interval_ms" integer,
	"ai_hint_interval_ms" integer,
	"ai_hint_next_run_at" timestamp,
	"ai_hint_expires_at" timestamp,
	"ai_hint_reason" text,
	"min_interval_ms" integer,
	"max_interval_ms" integer,
	"paused_until" timestamp,
	"last_run_at" timestamp,
	"next_run_at" timestamp NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"url" text,
	"method" text,
	"headers_json" jsonb,
	"body_json" jsonb,
	"_locked_until" timestamp
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" text PRIMARY KEY NOT NULL,
	"endpoint_id" text NOT NULL,
	"status" text NOT NULL,
	"attempt" integer NOT NULL,
	"started_at" timestamp NOT NULL,
	"finished_at" timestamp,
	"duration_ms" integer,
	"error_message" text,
	"error_details" jsonb
);
--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_endpoint_id_job_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."job_endpoints"("id") ON DELETE no action ON UPDATE no action;