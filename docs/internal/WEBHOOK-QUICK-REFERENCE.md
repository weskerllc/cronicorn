# Webhook Quick Reference Card

## TL;DR

✅ **Problem**: User pays, webhook fails → user never upgraded
✅ **Solution**: Track event IDs, return proper status codes, Stripe retries automatically

## 3-Step Process

```
1. Check if event already processed → Skip if yes (idempotency)
2. Process event → Update user subscription
3. Mark as processed → Return 200 to Stripe
   (On error: Mark as failed, return 500 → Stripe retries)
```

## Status Codes Matter

| Code | Meaning | Stripe Action |
|------|---------|---------------|
| 200 | Success | ✅ Stop retrying |
| 500 | Temporary error | 🔄 Retry (1h, 3h, 6h, 12h, 24h) |
| 400 | Invalid signature | ❌ Don't retry (malicious) |

## Database Table

```sql
webhook_events (
  id TEXT PRIMARY KEY,        -- Stripe event ID (unique)
  processed BOOLEAN,          -- Already handled?
  error TEXT,                 -- What went wrong?
  retry_count INTEGER         -- How many attempts?
)
```

## Code Pattern

```typescript
// 1. Check idempotency
if (await isProcessed(event.id)) return;

// 2. Record event
await recordEvent(event);

// 3. Process
try {
  await updateUserSubscription(event.data);
  await markProcessed(event.id);
}
catch (error) {
  await markFailed(event.id, error);
  throw error; // → Stripe retries
}
```

## Key Benefits

✅ **Never lose a subscription**: Stripe retries until success
✅ **No duplicate charges**: Event IDs prevent double processing
✅ **Full audit trail**: All events logged with errors
✅ **Manual recovery**: Can replay from database if needed

## Quick Debug

```sql
-- Find failed webhooks
SELECT * FROM webhook_events
WHERE processed = false
  AND retry_count > 3;

-- Check specific event
SELECT * FROM webhook_events WHERE id = 'evt_xxx';
```

## Testing Webhooks Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks
stripe listen --forward-to localhost:3000/webhooks/stripe

# Trigger test event
stripe trigger checkout.session.completed
```

## What If...

**Q: Database is down when webhook arrives?**
A: Return 500 → Stripe retries when DB is back up

**Q: Same webhook sent twice?**
A: First time processes, second time ignored (idempotent)

**Q: Event fails after all retries?**
A: Check database, manually replay from Stripe Dashboard

**Q: Need to test idempotency?**
A: Send same webhook twice, check only processed once

## Files to Know

- **Handler**: `packages/services/src/subscriptions/manager.ts`
- **Repo**: `packages/adapter-drizzle/src/webhook-events-repo.ts`
- **Endpoint**: `apps/api/src/routes/webhooks.ts`
- **Tests**: `packages/services/src/subscriptions/__tests__/manager.test.ts`

## Maintenance

```typescript
// Run monthly: Delete events older than 30 days
await webhookEventsRepo.deleteOldEvents(
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
);
```

## Monitoring Queries

```sql
-- Unprocessed events (> 1 hour old)
SELECT id, type, received_at
FROM webhook_events
WHERE processed = false
  AND received_at < NOW() - INTERVAL '1 hour';

-- High retry counts (might be stuck)
SELECT id, type, error, retry_count
FROM webhook_events
WHERE retry_count > 5;

-- Error trends
SELECT type, COUNT(*) as failures
FROM webhook_events
WHERE processed = false
GROUP BY type;
```

## Security Checklist

✅ Verify Stripe signature (already implemented)
✅ Use HTTPS in production
✅ Keep webhook secret in environment variables
✅ Log all webhook activity
✅ Monitor for suspicious patterns

## Resources

- [Full Documentation](./WEBHOOK-BEST-PRACTICES.md)
- [Implementation Details](./WEBHOOK-IMPLEMENTATION-SUMMARY.md)
- [ADR-0048](../../.adr/0048-stripe-webhook-idempotency-and-error-handling.md)
- [Stripe Docs](https://docs.stripe.com/webhooks)
