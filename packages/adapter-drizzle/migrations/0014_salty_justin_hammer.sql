ALTER TABLE "runs" DROP CONSTRAINT "runs_endpoint_id_job_endpoints_id_fk";
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_endpoint_id_job_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."job_endpoints"("id") ON DELETE cascade ON UPDATE no action;