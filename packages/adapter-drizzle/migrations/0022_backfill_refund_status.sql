-- Backfill refund_status for existing users
-- Pro users with NULL refund_status should be marked as 'expired' (past refund window)
-- Free users with non-NULL refund_status (excluding 'issued') should also be marked as 'expired' for data cleanliness
UPDATE "user" SET "refund_status" = 'expired' WHERE "tier" = 'pro' AND "refund_status" IS NULL;--> statement-breakpoint
UPDATE "user" SET "refund_status" = 'expired' WHERE "tier" = 'free' AND "refund_status" IS NOT NULL AND "refund_status" != 'issued';
