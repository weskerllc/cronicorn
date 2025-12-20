# 14-Day Money-Back Guarantee for Pro Subscriptions

**Date:** 2025-12-19
**Status:** Accepted

## Context

We needed to implement a 14-day money-back guarantee for Pro tier subscriptions to:
1. Reduce customer risk and increase conversion rates
2. Compete with industry-standard SaaS refund policies
3. Provide a self-service refund flow to reduce support burden
4. Maintain compliance with consumer protection regulations

The refund guarantee must:
- Apply only to Pro tier (Enterprise handled manually)
- Cover only the first billing cycle
- Be auditable and idempotent
- Integrate cleanly with existing Stripe subscription architecture (ADR-0022)

## Decision

We implemented a **webhook-driven, database-tracked refund system** that extends the existing subscription management infrastructure.

### Architecture

**Schema Changes** (`packages/adapter-drizzle/src/schema.ts`):
- Added 7 new fields to `user` table:
  - `subscription_activated_at`: Timestamp of first successful payment
  - `refund_window_expires_at`: Activation date + 14 days (computed)
  - `last_payment_intent_id`: Stripe payment intent for refund
  - `last_invoice_id`: Stripe invoice reference (optional)
  - `refund_status`: Eligibility status (`eligible`, `requested`, `issued`, `expired`)
  - `refund_issued_at`: When refund was processed
  - `refund_reason`: User-provided or system reason

**Domain Port Extensions** (`packages/domain/src/ports/external.ts`):
```typescript
interface PaymentProvider {
  // New methods for refund operations
  issueRefund(params: {
    paymentIntentId: string;
    amountCents?: number;
    reason?: "requested_by_customer" | "duplicate" | "fraudulent";
    metadata?: Record<string, string>;
  }): Promise<{ refundId: string; status: string }>;
  
  cancelSubscriptionNow(subscriptionId: string): Promise<void>;
}
```

**Stripe Adapter** (`packages/adapter-stripe/src/stripe-client.ts`):
- `issueRefund()`: Calls `stripe.refunds.create()` with full amount by default
- `cancelSubscriptionNow()`: Calls `stripe.subscriptions.cancel()` with `prorate: false`

**Service Layer** (`packages/services/src/subscriptions/manager.ts`):
- `requestRefund()` method with 5-step validation:
  1. Verify user is Pro tier
  2. Check refund_status is not "issued"
  3. Validate within 14-day window
  4. Confirm payment intent exists
  5. Issue refund, cancel subscription, downgrade to free

**Webhook Integration**:
- `handleCheckoutCompleted()` now stores:
  - `subscription_activated_at` = now
  - `refund_window_expires_at` = now + 14 days
  - `last_payment_intent_id` from session
  - `refund_status` = "eligible" (Pro only)
- `handlePaymentSucceeded()` checks `refund_status === "issued"` for idempotency

**API Routes** (`apps/api/src/routes/subscriptions/`):
- `POST /subscriptions/refund` (hidden from OpenAPI)
  - Auth required
  - Returns `{ refundId, status }` on success
  - 400 if ineligible, 409 if already refunded
- `GET /subscriptions/status` enhanced with:
  ```typescript
  {
    tier: "pro",
    status: "active",
    endsAt: "2025-01-15T00:00:00Z",
    refundEligibility: {
      eligible: true,
      expiresAt: "2025-01-10T00:00:00Z",
      status: "eligible"
    }
  }
  ```

### Key Design Choices

**1. Database-tracked eligibility (not computed on demand)**

Why:
- Provides audit trail of when window expires
- Prevents race conditions if computed separately
- Enables backfill script for existing users

Implementation:
- Set at checkout completion
- Persisted as denormalized field for query performance

Tradeoff: Requires schema migration, but improves reliability.

**2. Refund-then-cancel pattern (not cancel-then-refund)**

Why:
- Stripe refunds require payment intent, which is available immediately
- Canceling first might complicate refund tracking
- Ensures user gets money back even if cancellation fails

Implementation:
- Issue refund first (can throw error safely)
- Then cancel subscription (best-effort)
- Update database last (only if both succeed)

Consequence: Rare edge case where refund succeeds but subscription isn't canceled (can be fixed manually).

**3. Only Pro tier gets automatic refunds (not Enterprise)**

Why:
- Pro is self-serve and higher volume
- Enterprise involves contracts and manual negotiation
- Reduces risk of large refund abuse

Implementation:
- `refund_status` set to "expired" for Enterprise on checkout
- API handler rejects non-Pro requests

Future: Add admin override endpoint for support to manually process Enterprise refunds.

**4. Store payment intent ID (not just invoice ID)**

Why:
- Stripe refunds API requires payment_intent_id
- Invoice ID requires extra lookup (API call)
- Webhook data includes payment intent directly

Implementation:
- Extracted from `session.payment_intent` in checkout webhook
- Stored in `last_payment_intent_id` field

Alternative considered: Fetch latest invoice from Stripe API (rejected due to extra latency).

**5. Idempotent webhook handling (check refund_status)**

Why:
- Stripe may send duplicate `invoice.payment_succeeded` events
- Prevents overwriting refund state after downgrade
- Ensures consistent state even with retry storms

Implementation:
```typescript
if (user.refundStatus === "issued") {
  console.log("Ignoring payment_succeeded for refunded user");
  return;
}
```

**6. No partial refunds (always full amount)**

Why:
- Simpler UX and implementation
- Industry standard for money-back guarantees
- Reduces decision fatigue for users

Implementation:
- `amountCents` parameter optional (defaults to full)
- Future: Could add admin endpoint for partial refunds

**7. 14-day window starts at first payment (not signup)**

Why:
- Aligns with payment date for accounting
- Users may delay activating subscription
- Clearer cutoff for billing disputes

Implementation:
- `subscription_activated_at` set in `handleCheckoutCompleted()`
- Stored as UTC timestamp for timezone consistency

## Consequences

### Positive

✅ **Self-service refunds** reduce support load (estimated 80% of refund requests)  
✅ **Auditable** with full database trail (timestamps, reasons, refund IDs)  
✅ **Idempotent** webhooks prevent duplicate processing  
✅ **Test coverage** 32/32 unit tests passing (5 new refund tests)  
✅ **Clean architecture** extends existing ports/adapters cleanly  
✅ **Backfill-safe** existing Pro users marked as "expired" to prevent retroactive claims  

### Tradeoffs & Limitations

⚠️ **No multi-refund tracking**: One refund per Stripe subscription ID (acceptable: users can re-subscribe)  
⚠️ **No timezone handling**: 14-day window is strict UTC (acceptable: industry standard)  
⚠️ **No prorated refunds**: Always full amount (acceptable: guarantee is binary)  
⚠️ **Enterprise excluded**: Manual process required (acceptable: lower volume)  
⚠️ **No notification emails**: Users only see confirmation in UI (future enhancement)  

### Security Considerations

**Rate Limiting**:
- Endpoint requires authentication (Better Auth session)
- Eligibility checked in database (can't bypass with API calls)
- One refund per subscription (prevents abuse)

**Fraud Prevention**:
- Payment intent must exist (prevents fake refund attempts)
- Webhook signature verification (prevents spoofed events)
- Audit trail tracks all refund attempts

### Migration Path

**Immediate** (completed):
1. ✅ Run migration `0018_add_refund_guarantee_fields.sql`
2. ✅ Run backfill `0019_backfill_refund_status.sql` (marks existing Pro users as expired)
3. ✅ Deploy API with new `/subscriptions/refund` endpoint
4. ✅ Update web UI to show refund CTA (Phase 9)
  - Implemented on dashboard plan route (`apps/web/src/routes/_authed/plan.tsx`) with inline countdown, confirmation dialog, and API wiring to `/subscriptions/refund`

**Future Enhancements**:
- Add admin override endpoint: `POST /admin/subscriptions/:userId/refund`
- Email notifications when refund issued
- Prorated refunds for special cases
- Extend to Enterprise tier with approval workflow
- Analytics dashboard for refund rates
- Slack alerts for support team

### Testing Strategy

**Unit Tests** (32 total, all passing):
- Stripe adapter: `issueRefund()` and `cancelSubscriptionNow()` (4 tests)
- Manager: Refund eligibility validation (5 tests)
  - Happy path: Issue refund within window
  - Reject: Non-Pro tier
  - Reject: Already refunded
  - Reject: Window expired
  - Reject: No payment intent

**Integration Tests** (future):
- API route: POST /subscriptions/refund with auth
- Webhook: Verify idempotency after refund

**Manual Testing** (future):
- Use Stripe test mode with test clock
- Create Pro subscription → Wait 5 days → Request refund → Verify downgrade

### Monitoring & Observability

**Logs**:
- `[SubscriptionsManager] Issuing refund` with userId and payment intent
- `[SubscriptionsManager] Refund issued` with refundId and amount

**Metrics** (to add):
- Refund rate (refunds / new Pro subscriptions)
- Time to refund (checkout to refund request)
- Refund window utilization (% of eligible users who refund)

## References

- **Related ADRs**:
  - ADR-0022: Stripe Subscription Integration (base architecture)
  
- **Schema**:
  - `packages/adapter-drizzle/src/schema.ts` (user table with refund fields)
  - `packages/adapter-drizzle/migrations/0018_add_refund_guarantee_fields.sql`
  - `packages/adapter-drizzle/migrations/0019_backfill_refund_status.sql`
  
- **Domain**:
  - `packages/domain/src/ports/external.ts` (PaymentProvider with refund methods)
  - `packages/domain/src/ports/repos.ts` (JobsRepo with refund fields)
  
- **Implementation**:
  - `packages/adapter-stripe/src/stripe-client.ts` (Stripe refund/cancel)
  - `packages/services/src/subscriptions/manager.ts` (refund business logic)
  - `apps/api/src/routes/subscriptions/` (refund API endpoint)
  
- **Tests**:
  - `packages/adapter-stripe/src/__tests__/stripe-client.test.ts`
  - `packages/services/src/subscriptions/__tests__/manager.test.ts`
  
- **External**:
  - [Stripe Refunds API](https://docs.stripe.com/api/refunds)
  - [Stripe Subscription Cancellation](https://docs.stripe.com/api/subscriptions/cancel)
