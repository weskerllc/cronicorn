-- Backfill refund status for existing Pro/Enterprise users
-- Set refund_status to 'expired' to prevent retroactive claims
-- Set subscription_activated_at to NOW() as a best guess for existing subscriptions

UPDATE "user"
SET 
  refund_status = 'expired',
  subscription_activated_at = NOW()
WHERE 
  tier IN ('pro', 'enterprise')
  AND refund_status IS NULL;

-- Log the number of affected rows for audit
-- This should be run once after migration 0018
