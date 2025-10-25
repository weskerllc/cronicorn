CREATE TABLE "ai_analysis_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"endpoint_id" text NOT NULL,
	"analyzed_at" timestamp NOT NULL,
	"tool_calls" jsonb,
	"reasoning" text,
	"token_usage" integer,
	"duration_ms" integer
);
--> statement-breakpoint
ALTER TABLE "ai_analysis_sessions" ADD CONSTRAINT "ai_analysis_sessions_endpoint_id_job_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."job_endpoints"("id") ON DELETE cascade ON UPDATE no action;