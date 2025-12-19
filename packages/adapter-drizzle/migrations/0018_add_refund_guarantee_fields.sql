-- Add 14-day refund guarantee fields to user table
ALTER TABLE "user" ADD COLUMN "subscription_activated_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "refund_window_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_invoice_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "refund_status" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "refund_issued_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "refund_reason" text;
