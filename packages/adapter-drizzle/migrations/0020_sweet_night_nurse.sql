CREATE TABLE "webhook_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE INDEX "webhook_events_processed_at_idx" ON "webhook_events" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX "webhook_events_event_type_idx" ON "webhook_events" USING btree ("event_type");