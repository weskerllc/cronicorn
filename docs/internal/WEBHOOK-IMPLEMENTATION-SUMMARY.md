# Webhook Implementation Summary

## Problem Solved

When a user subscribes to our service via Stripe, there are three steps:
1. User completes checkout on Stripe
2. Stripe processes payment
3. Stripe sends webhook to our server
4. We update user's tier in our database

**Critical Risk:** If step 4 fails, the user pays but never gets upgraded.

## Solution Overview

We implemented a robust webhook handling system that:
1. **Prevents duplicate processing** (idempotency)
2. **Automatically retries on failure** (via Stripe's built-in retry mechanism)
3. **Logs all events** for debugging and manual recovery

## How It Works

### 1. First-Time Webhook Delivery

```
User completes checkout
   ↓
Stripe sends webhook: evt_123
   ↓
Our webhook handler:
   1. Verify signature ✓
   2. Check if evt_123 already processed → No
   3. Record evt_123 in database (processed=false)
   4. Update user tier → Success!
   5. Mark evt_123 as processed
   ↓
Return 200 to Stripe
```

### 2. Retry After Failure

```
User completes checkout
   ↓
Stripe sends webhook: evt_456
   ↓
Our webhook handler:
   1. Verify signature ✓
   2. Check if evt_456 already processed → No
   3. Record evt_456 in database (processed=false)
   4. Update user tier → DATABASE ERROR!
   5. Mark evt_456 as failed (error message saved)
   ↓
Return 500 to Stripe
   ↓
Stripe retries 1 hour later
   ↓
Our webhook handler:
   1. Verify signature ✓
   2. Check if evt_456 already processed → No (still false)
   3. Already recorded, skip recording
   4. Update user tier → Success!
   5. Mark evt_456 as processed
   ↓
Return 200 to Stripe
```

### 3. Duplicate Delivery (Idempotency)

```
Stripe sends webhook: evt_789
   ↓
Our webhook handler processes successfully
   ↓
Return 200 to Stripe
   ↓
Network glitch - Stripe didn't receive our 200
   ↓
Stripe retries (thinks we didn't get it)
   ↓
Stripe sends webhook: evt_789 again
   ↓
Our webhook handler:
   1. Verify signature ✓
   2. Check if evt_789 already processed → Yes!
   3. Return immediately (idempotent)
   ↓
Return 200 to Stripe
```

## Database Schema

```sql
CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,              -- Stripe event ID (unique)
  type TEXT NOT NULL,                -- Event type
  processed BOOLEAN DEFAULT false,   -- Successfully processed?
  processed_at TIMESTAMP,            -- When processed
  received_at TIMESTAMP DEFAULT now(), -- When received
  data JSONB,                        -- Full event data (for debugging)
  error TEXT,                        -- Error message (if failed)
  retry_count INTEGER DEFAULT 0      -- Number of retry attempts
);
```

## Code Flow

### WebhookEventsRepo (Database Layer)

```typescript
interface WebhookEventsRepo {
  getEvent(id: string): Promise<WebhookEventRecord | null>;
  recordEvent(event: { id, type, data }): Promise<void>;
  markProcessed(id: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
}
```

### SubscriptionsManager (Business Logic)

```typescript
async handleWebhookEvent(event: { id, type, data }) {
  // Step 1: Check idempotency
  const existing = await webhookEventsRepo.getEvent(event.id);
  if (existing?.processed) {
    return; // Already handled
  }

  // Step 2: Record if new
  if (!existing) {
    await webhookEventsRepo.recordEvent(event);
  }

  // Step 3: Process
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data);
        break;
      // ... other events
    }

    // Step 4: Mark success
    await webhookEventsRepo.markProcessed(event.id);
  }
  catch (error) {
    // Step 5: Mark failure and re-throw
    await webhookEventsRepo.markFailed(event.id, error.message);
    throw error; // Stripe will retry
  }
}
```

### Webhook Endpoint (HTTP Layer)

```typescript
router.post("/webhooks/stripe", async (c) => {
  const signature = c.req.header("stripe-signature");
  
  try {
    const body = await c.req.text();
    const event = await paymentProvider.verifyWebhook(body, signature, webhookSecret);
    
    await subscriptionsManager.handleWebhookEvent(event);
    
    return c.json({ received: true }, 200); // Success
  }
  catch (error) {
    if (error.message.includes("signature")) {
      return c.json({ error: "Invalid signature" }, 400); // Don't retry
    }
    return c.json({ error: "Processing failed" }, 500); // Retry
  }
});
```

## Stripe's Retry Behavior

- **Success (200)**: Stripe stops retrying
- **Temporary Error (500)**: Stripe retries with exponential backoff
- **Client Error (400)**: Stripe does not retry (likely malicious)

Retry schedule:
- Immediately
- 1 hour later
- 3 hours later
- 6 hours later
- 12 hours later
- 24 hours later

## Error Recovery

### Automatic Recovery
Most errors are transient (database timeout, network issue) and resolve themselves on retry.

### Manual Recovery
If an event fails after all retries:
1. Check `webhook_events` table for failed events
2. Use Stripe Dashboard to resend the event
3. Or manually call the handler with stored event data

Query for failed events:
```sql
SELECT id, type, error, retry_count, received_at
FROM webhook_events
WHERE processed = false
  AND retry_count > 3
ORDER BY received_at DESC;
```

## Testing

### Unit Tests
Tests verify:
- ✅ Events are processed correctly
- ✅ Duplicate events are ignored (idempotency)
- ✅ Failed events are marked and errors recorded
- ✅ Retries work after initial failure

Run tests:
```bash
pnpm --filter @cronicorn/services test manager.test.ts
```

### Integration Testing
Use Stripe CLI to send test webhooks:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
```

## Monitoring

Key metrics to track:
- Number of unprocessed events
- Events with high retry counts
- Time to process events
- Error rates by event type

## Maintenance

### Cleaning Up Old Events

Run periodically (e.g., monthly) to prevent unbounded growth:

```typescript
// Delete events older than 30 days
await webhookEventsRepo.deleteOldEvents(
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
);
```

Recommendation: Create a scheduled job for this.

## Benefits

1. **No Data Loss**: If webhook fails, Stripe retries automatically
2. **Idempotency**: Safe against duplicate deliveries
3. **Debugging**: Full event data stored for troubleshooting
4. **Monitoring**: Track failures and retry attempts
5. **Manual Recovery**: Can replay events if needed

## Files Changed

- `packages/adapter-drizzle/src/webhook-events-repo.ts` - New repository
- `packages/adapter-drizzle/src/schema.ts` - Added webhook_events table
- `packages/domain/src/ports/repos.ts` - Added WebhookEventsRepo port
- `packages/services/src/subscriptions/manager.ts` - Added idempotency logic
- `packages/services/src/subscriptions/types.ts` - Added webhookEventsRepo dependency
- `apps/api/src/lib/create-subscriptions-manager.ts` - Wire up new repo
- Migration: `packages/adapter-drizzle/migrations/0016_young_ultimates.sql`

## References

- [ADR-0048: Stripe Webhook Idempotency and Error Handling](../../.adr/0048-stripe-webhook-idempotency-and-error-handling.md)
- [Webhook Best Practices](./WEBHOOK-BEST-PRACTICES.md)
- [Stripe Webhook Documentation](https://docs.stripe.com/webhooks)
- [Stripe Best Practices](https://stripe.dev/blog/building-solid-stripe-integrations-developers-guide-success)
