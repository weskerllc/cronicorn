CREATE INDEX "ai_sessions_endpoint_id_idx" ON "ai_analysis_sessions" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "ai_sessions_analyzed_at_idx" ON "ai_analysis_sessions" USING btree ("analyzed_at");--> statement-breakpoint
CREATE INDEX "job_endpoints_job_id_idx" ON "job_endpoints" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "job_endpoints_next_run_at_idx" ON "job_endpoints" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "runs_endpoint_id_idx" ON "runs" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "runs_started_at_idx" ON "runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "runs_status_idx" ON "runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "runs_endpoint_started_idx" ON "runs" USING btree ("endpoint_id","started_at");