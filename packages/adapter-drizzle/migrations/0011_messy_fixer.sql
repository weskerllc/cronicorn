ALTER TABLE "device_codes" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "oauth_tokens" ALTER COLUMN "created_at" SET DEFAULT now();