CREATE INDEX "job_endpoints_tenant_id_idx" ON "job_endpoints" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "job_endpoints_tenant_id_archived_idx" ON "job_endpoints" USING btree ("tenant_id","archived_at");--> statement-breakpoint
CREATE INDEX "jobs_user_id_idx" ON "jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_stripe_customer_id_idx" ON "user" USING btree ("stripe_customer_id");