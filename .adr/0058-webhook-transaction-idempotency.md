# Webhook Transaction Wrapping and Idempotency Tracking

**Date:** 2026-01-06
**Status:** Accepted

## Context

Stripe webhooks are critical for payment and subscription processing. Without proper safeguards, webhook handling has several risks:

1. **Duplicate Events**: Stripe can send the same webhook event multiple times (e.g., during network retries, failover scenarios). Processing the same event twice could result in:
   - Duplicate subscription activations
   - Double refunds
   - Incorrect tier assignments

2. **Partial Updates**: If an error occurs mid-processing (after updating user subscription but before recording payment details), the database is left in an inconsistent state.

3. **No Audit Trail**: Without tracking processed events, debugging duplicate processing issues is extremely difficult.

## Decision

We implemented two complementary safeguards:

### 1. Transaction Wrapping (Atomicity)

All webhook processing occurs within a single database transaction:

```typescript
await db.transaction(async (tx) => {
  // Check idempotency
  const alreadyProcessed = await webhookEventsRepo.hasBeenProcessed(event.id);
  if (alreadyProcessed) return;

  // Process webhook (all DB writes happen here)
  await subscriptionsManager.handleWebhookEvent(event);

  // Record event as processed
  await webhookEventsRepo.recordProcessedEvent(event.id, event.type);
});
```

**Guarantees:**
- All-or-nothing: Either all changes commit, or none do
- No partial state on errors (automatic rollback)
- ACID properties maintained

### 2. Idempotency Tracking (Duplicate Prevention)

Created `webhook_events` table to track processed events:

```sql
CREATE TABLE "webhook_events" (
  "event_id" text PRIMARY KEY NOT NULL,
  "event_type" text NOT NULL,
  "processed_at" timestamp with time zone NOT NULL,
  "status" text NOT NULL,
  "error_message" text
);
```

**Process:**
1. Check if event ID exists before processing
2. If duplicate → log and return 200 OK (no-op)
3. If new → process and record atomically in same transaction

**Implementation Details:**
- Uses `INSERT ... ON CONFLICT DO NOTHING` for idempotent inserts
- Event ID is Stripe's unique event identifier (e.g., "evt_1234567890")
- Indexed on `event_id` (primary key) for fast lookups
- Additional indexes on `processed_at` and `event_type` for observability

## Consequences

### Benefits

**Reliability:**
- Duplicate webhook events are safely ignored (no double-processing)
- Partial updates are impossible (transaction atomicity)
- Consistent database state guaranteed

**Observability:**
- Full audit trail of processed webhook events
- Can query by event type or time range
- Duplicate attempts are logged for debugging

**Simplicity:**
- Implementation is straightforward and battle-tested
- Transaction-per-request pattern already used elsewhere in codebase
- No external dependencies (Redis, etc.) required

### Trade-offs

**Database Growth:**
- `webhook_events` table grows indefinitely
- Mitigation: Future cleanup job to archive old events (>90 days)

**Transaction Duration:**
- Webhook processing holds database transaction open
- Mitigation: Webhook handlers are fast (<500ms typical)
- Stripe has 30-second timeout, well within limits

**Idempotency Window:**
- Events are tracked forever (no expiration)
- Upside: Stronger guarantee than time-based expiration
- Downside: Table grows linearly with webhook volume

### Files Affected

**Domain Layer:**
- `packages/domain/src/ports/repos.ts` - Added `WebhookEventsRepo` port

**Adapter Layer:**
- `packages/adapter-drizzle/src/schema.ts` - Added `webhookEvents` table
- `packages/adapter-drizzle/src/webhook-events-repo.ts` - Repository implementation
- `packages/adapter-drizzle/src/index.ts` - Export webhook events repo
- `packages/adapter-drizzle/migrations/0020_sweet_night_nurse.sql` - Database migration

**API Layer:**
- `apps/api/src/routes/webhooks.ts` - Transaction wrapping and idempotency checks

**Tests:**
- `packages/adapter-drizzle/src/__tests__/webhook-events-repo.test.ts` - Integration tests (7 tests)

### Operational Considerations

**Monitoring:**
- Log duplicate webhook attempts for visibility
- Monitor `webhook_events` table size
- Alert on unusual duplicate rates (potential Stripe issues)

**Rollback Plan:**
If this implementation causes issues:
1. Database transaction rollback handles failures automatically
2. Revert webhook handler to previous version
3. Keep `webhook_events` table for audit trail

**Future Improvements:**
- Add background job to archive old webhook events (>90 days)
- Add error status tracking for failed processing attempts
- Add retry counter for failed events

## References

**Production Readiness Analysis:**
- Issue 5: Add transaction wrapping for webhooks
- Issue 6: Implement webhook idempotency tracking

**Related ADRs:**
- ADR-0002: Hexagonal Architecture Principles (port/adapter pattern)
- ADR-0009: Transaction-per-Test Pattern (same pattern used here)

**External Documentation:**
- [Stripe Webhooks Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Stripe Idempotent Requests](https://stripe.com/docs/api/idempotent_requests)
