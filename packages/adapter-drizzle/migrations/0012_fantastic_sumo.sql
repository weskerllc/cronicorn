ALTER TABLE "device_codes" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;