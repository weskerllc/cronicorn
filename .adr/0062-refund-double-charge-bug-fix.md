# Fix Refund Double-Charge Bug with Operation Reordering

**Date:** 2026-02-07
**Status:** Accepted

## Context

A critical bug existed in the subscription refund flow where users could receive a double refund. The `requestRefund()` method in `SubscriptionsManager` performed the irreversible refund operation *before* the reversible subscription cancellation. When cancellation failed after a refund had already been issued, the error handler would reset the refund status to "eligible", allowing a retry that issued a second refund.

The root cause was **operation ordering**: performing an irreversible side effect (Stripe refund) before a reversible one (subscription cancellation) created a window where partial failure left the system in an inconsistent state.

## Decision

We applied three complementary fixes in the service layer (`SubscriptionsManager`):

### 1. Operation Reordering

Reversed the order of operations so the reversible action happens first:

- **Before:** Refund (irreversible) → Cancel subscription (reversible)
- **After:** Cancel subscription (reversible) → Refund (irreversible)

If cancellation fails, no refund has been issued, making the failure safely retryable.

### 2. State Tracking with Differentiated Error Handling

Added boolean flags (`cancelCompleted`, `refundIssued`) to track which operations succeeded, enabling the catch block to differentiate three failure scenarios:

| Scenario | State | Recovery |
|----------|-------|----------|
| Cancel failed | `cancelCompleted=false` | Keep status `"requested"` (safe to retry) |
| Refund failed after cancel | `cancelCompleted=true, refundIssued=false` | Set status `"cancel_completed_refund_failed"` (manual intervention) |
| DB update failed after refund | `refundIssued=true` | Set status `"issued"` (prevents double refund) |

### 3. Validation Guard

Added a check to reject refund requests when status is `"cancel_completed_refund_failed"`, preventing automated retry of a partially-completed operation that requires manual intervention.

## Consequences

### Benefits

- Eliminates the double-refund vulnerability entirely
- Maintains existing happy-path behavior unchanged
- Provides clear state transitions for every failure mode
- Enables proper manual intervention workflows for partial failures

### Trade-offs

- Introduces a new refund status (`"cancel_completed_refund_failed"`) that requires operational handling
- Partial failures (cancel succeeded, refund failed) require manual intervention rather than automatic retry

### Files Affected

**Services:**
- `packages/services/src/subscriptions/manager.ts` - Reordered operations, added state tracking, enhanced error handling

**Tests:**
- `packages/services/src/subscriptions/__tests__/manager.test.ts` - Three new test cases covering all failure scenarios

## References

- ADR-0058: Webhook Transaction Idempotency (related payment safety pattern)
