# Hexagonal Architecture Enforcement in Services Layer

**Date:** 2025-10-17
**Status:** Accepted

## Context

During an architectural review, we identified violations of hexagonal architecture principles in the services layer:

1. **Services importing concrete adapters**: `SubscriptionsManager` directly imported and depended on `StripePaymentProvider` (a concrete adapter implementation) instead of the `PaymentProvider` port (interface).

2. **Package-level adapter dependencies**: The `@cronicorn/services` package declared dependencies on concrete adapter packages (`@cronicorn/adapter-stripe`, `@cronicorn/adapter-drizzle`, etc.) in its `package.json`.

3. **Worker dependencies in services**: The services package incorrectly depended on `@cronicorn/worker-scheduler`.

These violations broke the dependency inversion principle and prevented us from easily swapping implementations or testing with mocks.

## Decision

We enforced strict hexagonal architecture boundaries by:

### 1. Enhanced PaymentProvider Port

Added `extractTierFromSubscription(subscriptionData: unknown): "pro" | "enterprise" | null` method to the `PaymentProvider` port. This provides a provider-agnostic way to extract tier information from subscription webhook data.

**Rationale**: The need to map price IDs to tiers is a legitimate domain concept ("given subscription data, determine the tier"), not a Stripe-specific implementation detail. By adding it to the port, we allow any payment provider to implement its own tier extraction logic.

### 2. Removed Concrete Dependencies from Services

- Removed `StripePaymentProvider` import from `SubscriptionsManager`
- Updated constructor to only accept `SubscriptionDeps` (which contains the `PaymentProvider` port)
- Replaced `stripeProvider.getTierFromPriceId()` calls with `paymentProvider.extractTierFromSubscription()`

### 3. Cleaned Package Dependencies

Removed all adapter and worker dependencies from `packages/services/package.json`:
- ❌ `@cronicorn/adapter-cron`
- ❌ `@cronicorn/adapter-drizzle`
- ❌ `@cronicorn/adapter-system-clock`
- ❌ `@cronicorn/adapter-stripe`
- ❌ `@cronicorn/worker-scheduler`

Services now only depends on `@cronicorn/domain`.

### 4. Updated Composition Roots

Modified `createSubscriptionsManager()` factory to:
- Remove the `stripeProvider` parameter
- Wire dependencies exclusively through the `PaymentProvider` port

## Consequences

### Positive

- ✅ **True dependency inversion**: Services depend on abstractions (ports), not concrete implementations
- ✅ **Easier testing**: Can mock `PaymentProvider` without importing Stripe adapter
- ✅ **Clear boundaries**: Package dependencies enforce architectural rules at build time
- ✅ **Pluggable implementations**: Could swap Stripe for another provider without touching services layer
- ✅ **Better separation of concerns**: Domain logic separated from infrastructure

### Neutral

- 📝 **More port methods**: Adding provider-agnostic abstractions increases port surface area
- 📝 **Type safety trade-off**: `extractTierFromSubscription` accepts `unknown` and must validate at runtime

### Negative

- ⚠️ **Migration effort**: Existing code using deprecated `getTierFromPriceId` should be updated
- ⚠️ **Slightly more verbose**: Extracting tier requires passing full subscription object vs just price ID

## References

- Related tasks: TASK-MVP.hexagonal-architecture
- Modified files:
  - `packages/domain/src/ports/external.ts` - Added method to port
  - `packages/adapter-stripe/src/stripe-client.ts` - Implemented new port method
  - `packages/services/src/subscriptions/manager.ts` - Removed adapter dependency
  - `packages/services/package.json` - Cleaned dependencies
  - `apps/api/src/lib/create-subscriptions-manager.ts` - Updated composition root

## Implementation Notes

The `extractTierFromSubscription` implementation in `StripePaymentProvider` uses defensive type guards to safely navigate the `unknown` subscription data structure without type assertions.

```typescript
extractTierFromSubscription(subscriptionData: unknown): "pro" | "enterprise" | null {
  // Runtime validation of nested structure
  if (
    subscriptionData
    && typeof subscriptionData === "object"
    && "items" in subscriptionData
    && subscriptionData.items
    && typeof subscriptionData.items === "object"
    && "data" in subscriptionData.items
    && Array.isArray(subscriptionData.items.data)
    && subscriptionData.items.data.length > 0
  ) {
    const firstItem = subscriptionData.items.data[0];
    if (
      firstItem
      && typeof firstItem === "object"
      && "price" in firstItem
      && firstItem.price
      && typeof firstItem.price === "object"
      && "id" in firstItem.price
      && typeof firstItem.price.id === "string"
    ) {
      return this.reversePriceMap.get(firstItem.price.id) ?? null;
    }
  }
  return null;
}
```

This approach maintains type safety while working with webhook data that arrives as `unknown`.
