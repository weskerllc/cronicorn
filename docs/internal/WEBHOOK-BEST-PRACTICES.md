# Webhook Best Practices

This document outlines how we handle Stripe webhooks to ensure reliability and prevent data loss.

## Problem Statement

When a user subscribes to our service via Stripe:
1. Stripe processes the payment
2. Stripe sends us a webhook event (e.g., `checkout.session.completed`)
3. We update the user's tier in our database

**What happens if step 3 fails?**

Without proper handling:
- The user pays for a subscription
- The webhook handler crashes or times out
- Stripe gives up after a few retries
- The user's account is never upgraded ❌

## Our Solution

We implement Stripe's recommended best practices for webhook handling:

### 1. Idempotency via Event Tracking

Every webhook event has a unique ID (e.g., `evt_1A2B3C4D5E6F`). We track these in our database:

```typescript
// Check if we've already processed this event
const existingEvent = await webhookEventsRepo.getEvent(event.id);
if (existingEvent?.processed) {
  return; // Already handled, skip
}
```

**Benefits:**
- Duplicate webhook deliveries are safely ignored
- Manual webhook replays don't cause issues
- Retries don't cause duplicate operations

### 2. Automatic Retry on Failure

If our webhook handler fails, we:
1. Store the error in the database
2. Re-throw the error
3. Return HTTP 500 to Stripe
4. Stripe automatically retries with exponential backoff

```typescript
try {
  await processWebhookEvent(event);
  await webhookEventsRepo.markProcessed(event.id);
}
catch (error) {
  await webhookEventsRepo.markFailed(event.id, error.message);
  throw error; // Stripe will retry
}
```

**Stripe's retry schedule:**
- Immediate retry
- 1 hour later
- 3 hours later
- 6 hours later
- 12 hours later
- 24 hours later

### 3. Fast Response Times

We return a 200 response to Stripe quickly (< 10 seconds) to avoid timeouts.

The current implementation processes synchronously (simple and reliable), but if processing becomes slow, we can move to async:

```typescript
// Future optimization (if needed)
await webhookEventsRepo.recordEvent(event);
await queue.enqueue('process-webhook', event); // Process in background
return res.json({ received: true }, 200); // Return immediately
```

### 4. Comprehensive Logging

Every webhook event is stored with:
- Event ID and type
- Full event data (for debugging)
- Processing status
- Error messages
- Retry count

This allows us to:
- Debug failed webhooks
- Manually replay events if needed
- Monitor webhook reliability
- Track which events are problematic

## Implementation Details

### Database Schema

```sql
CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,              -- Stripe event ID
  type TEXT NOT NULL,                -- Event type
  processed BOOLEAN DEFAULT false,   -- Successfully processed?
  processed_at TIMESTAMP,            -- When processed
  received_at TIMESTAMP DEFAULT now(), -- When received
  data JSONB,                        -- Full event data
  error TEXT,                        -- Error message
  retry_count INTEGER DEFAULT 0      -- Retry attempts
);
```

### Key Components

1. **WebhookEventsRepo** (`packages/adapter-drizzle/src/webhook-events-repo.ts`)
   - Tracks processed events
   - Records failures and retries

2. **SubscriptionsManager** (`packages/services/src/subscriptions/manager.ts`)
   - Checks idempotency before processing
   - Records success/failure

3. **Webhook Endpoint** (`apps/api/src/routes/webhooks.ts`)
   - Verifies signatures
   - Returns appropriate status codes

### Security

✅ **Signature Verification**: Every webhook is verified using Stripe's signature before processing

```typescript
const event = await paymentProvider.verifyWebhook(body, signature, webhookSecret);
// Throws if signature is invalid
```

✅ **Replay Attack Prevention**: Events older than 5 minutes are automatically rejected

This follows Stripe's best practice to prevent replay attacks. If an attacker somehow obtains a valid webhook payload and signature, they can only replay it within 5 minutes of the original event creation.

✅ **Event Ordering**: The system is designed for eventual consistency and handles out-of-order event delivery. Stripe does not guarantee events arrive in order.

## Maintenance

### Cleaning Up Old Events

Webhook events should be cleaned up periodically to avoid unbounded growth:

```typescript
// Delete events older than 30 days
await webhookEventsRepo.deleteOldEvents(
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
);
```

**Recommendation:** Run this as a scheduled job (weekly or monthly).

### Monitoring

Monitor these metrics:
- Number of unprocessed events
- Events with high retry counts
- Error rates by event type

Query examples:

```sql
-- Events that failed multiple times
SELECT id, type, error, retry_count
FROM webhook_events
WHERE retry_count > 3
ORDER BY received_at DESC;

-- Events still not processed after 1 hour
SELECT id, type, received_at
FROM webhook_events
WHERE processed = false
  AND received_at < NOW() - INTERVAL '1 hour';
```

## Testing

### Unit Tests

The `SubscriptionsManager` has comprehensive tests for:
- Idempotency (duplicate events ignored)
- Error handling (failures are recorded)
- Retry logic (retries succeed after initial failure)

Run tests:
```bash
pnpm --filter @cronicorn/services test manager.test.ts
```

### Manual Testing

Use Stripe CLI to test webhooks locally:

```bash
# Forward webhooks to local server
stripe listen --forward-to localhost:3000/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

### Testing Idempotency

Send the same webhook twice:

```bash
# First delivery - should process normally
curl -X POST http://localhost:3000/webhooks/stripe \
  -H "stripe-signature: ..." \
  -d @webhook_payload.json

# Second delivery - should be ignored (idempotent)
curl -X POST http://localhost:3000/webhooks/stripe \
  -H "stripe-signature: ..." \
  -d @webhook_payload.json
```

## FAQ

### Q: What happens if the database is down when we receive a webhook?

A: The webhook handler will fail and return 500. Stripe will retry later when the database is back up.

### Q: What if we need to manually replay a webhook?

A: Use the Stripe Dashboard to resend the event, or query the `webhook_events` table and manually call the handler with the stored data.

### Q: How do we handle breaking changes to webhook event structures?

A: We store the full event data in JSONB. If Stripe changes the structure, we can:
1. Update our handler to support both old and new formats
2. Migrate old events if needed
3. Mark incompatible events as failed with clear error messages

### Q: Should we use transactions for webhook processing?

A: Yes, the `SubscriptionsManager` should be called within a database transaction. If any step fails, the entire operation rolls back, and Stripe will retry.

## References

- [ADR-0048: Stripe Webhook Idempotency and Error Handling](../.adr/0048-stripe-webhook-idempotency-and-error-handling.md)
- [Stripe Webhook Best Practices](https://stripe.dev/blog/building-solid-stripe-integrations-developers-guide-success)
- [Stripe Webhook Documentation](https://docs.stripe.com/webhooks)
- [Idempotent Requests](https://docs.stripe.com/api/idempotent_requests)
