# Stripe Webhook Idempotency and Error Handling

**Date:** 2025-11-18
**Status:** Accepted

## Context

When integrating with Stripe webhooks, we need to handle several critical scenarios:

1. **Duplicate webhooks**: Stripe may retry delivery of the same event multiple times (due to network issues, timeouts, or our server returning errors)
2. **Processing failures**: If our webhook handler fails, we need Stripe to retry, but we must avoid duplicate operations (e.g., upgrading a user twice)
3. **Data loss prevention**: If a user pays for a subscription but our webhook handler fails, the user's account should eventually be upgraded when Stripe retries

According to [Stripe's best practices](https://stripe.dev/blog/building-solid-stripe-integrations-developers-guide-success):
- Always verify webhook signatures ✓ (already implemented)
- Track event IDs to ensure idempotency
- Return 2xx quickly to acknowledge receipt
- Return 5xx on processing errors so Stripe retries
- Store events for debugging and manual reconciliation

## Decision

We implemented a webhook event tracking system with the following components:

### 1. Database Schema
Added `webhook_events` table to track all received webhook events:

```sql
CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,              -- Stripe event ID (evt_xxx)
  type TEXT NOT NULL,                -- Event type (checkout.session.completed, etc.)
  processed BOOLEAN DEFAULT false,   -- Has this event been successfully processed?
  processed_at TIMESTAMP,            -- When was it processed?
  received_at TIMESTAMP DEFAULT now(), -- When did we receive it?
  data JSONB,                        -- Full event data for debugging
  error TEXT,                        -- Error message if processing failed
  retry_count INTEGER DEFAULT 0      -- How many times has processing been attempted?
);
```

### 2. Domain Port
Added `WebhookEventsRepo` port with methods:
- `getEvent(eventId)` - Check if event exists and if it's been processed
- `recordEvent(event)` - Store a new webhook event
- `markProcessed(eventId)` - Mark event as successfully processed
- `markFailed(eventId, error)` - Record processing failure and increment retry count
- `deleteOldEvents(olderThan)` - Clean up old events (for maintenance)

### 3. Idempotency Logic in SubscriptionsManager
Updated `handleWebhookEvent` to:
1. Check if event has already been processed → return early if yes
2. Record event (if not already recorded)
3. Process the event
4. Mark as processed on success
5. Mark as failed and re-throw on error (so Stripe retries)

```typescript
async handleWebhookEvent(event: { id: string; type: string; data: any }): Promise<void> {
  // Check idempotency
  const existingEvent = await this.deps.webhookEventsRepo.getEvent(event.id);
  if (existingEvent?.processed) {
    return; // Already processed, skip
  }

  // Record if new
  if (!existingEvent) {
    await this.deps.webhookEventsRepo.recordEvent({
      id: event.id,
      type: event.type,
      data: event.data,
    });
  }

  try {
    // Process event based on type
    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutCompleted(event.data);
        break;
      // ... other events
    }

    // Mark as processed
    await this.deps.webhookEventsRepo.markProcessed(event.id);
  }
  catch (error) {
    // Record error and re-throw so Stripe retries
    await this.deps.webhookEventsRepo.markFailed(event.id, errorMessage);
    throw error;
  }
}
```

### 4. Error Response Strategy
The webhook endpoint already returns:
- `200` on success (Stripe stops retrying)
- `500` on processing errors (Stripe retries with exponential backoff)
- `400` on signature verification failures (Stripe does not retry - these are likely malicious)

## Consequences

### Benefits
1. **Idempotency guaranteed**: Duplicate webhook deliveries are safely ignored
2. **Automatic retry on failure**: If processing fails, Stripe retries and we can recover
3. **Debugging support**: All webhook events are stored with full data and error messages
4. **Monitoring**: Can track retry counts and identify problematic events
5. **Data loss prevention**: Even if initial processing fails, subscription changes eventually succeed via retry
6. **Replay attack prevention**: Events older than 5 minutes are rejected

### Tradeoffs
1. **Database storage**: Webhook events accumulate over time (mitigated by `deleteOldEvents`)
2. **Extra DB queries**: Every webhook requires 2-3 extra DB operations (acceptable overhead)
3. **Eventually consistent**: There may be a delay between payment and account upgrade if initial webhook fails (acceptable - Stripe retries quickly)
4. **Out-of-order events**: Stripe doesn't guarantee delivery order - design for eventual consistency

### Implementation Notes
- Event IDs are globally unique (Stripe guarantees this)
- Events older than 5 minutes are rejected to prevent replay attacks (Stripe best practice)
- Stripe recommends keeping events for at least 24 hours before cleanup
- Events should be cleaned up periodically via a maintenance job
- The webhook handler completes quickly (< 10s) to avoid Stripe timeouts
- **Future scalability**: If processing becomes slow, consider async processing with job queues while maintaining quick 200 response

## References
- [Stripe Best Practices](https://stripe.dev/blog/building-solid-stripe-integrations-developers-guide-success)
- [Stripe Webhook Documentation](https://docs.stripe.com/webhooks)
- [Idempotency Keys](https://docs.stripe.com/api/idempotent_requests)
- GitHub Issue: Handle Stripe webhook errors and ensure subscription changes don't get lost

## Related Code
- `packages/adapter-drizzle/src/webhook-events-repo.ts` - Repository implementation
- `packages/services/src/subscriptions/manager.ts` - Idempotency logic
- `apps/api/src/routes/webhooks.ts` - Webhook endpoint
- Migration: `packages/adapter-drizzle/migrations/0016_young_ultimates.sql`
