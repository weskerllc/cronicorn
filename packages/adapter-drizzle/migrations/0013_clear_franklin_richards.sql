ALTER TABLE "device_codes" ALTER COLUMN "client_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "device_codes" ADD COLUMN "last_polled_at" timestamp;--> statement-breakpoint
ALTER TABLE "device_codes" ADD COLUMN "scope" text;