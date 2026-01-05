
## 14-Day Money-Back Guarantee (Implemented)

**Status**: ✅ Core implementation complete  
**ADR**: `.adr/0023-14-day-refund-guarantee.md`  
**Related**: ADR-0022 Stripe Subscription Integration

### Implementation Summary
- Added 7 new fields to user table for refund tracking
- Extended PaymentProvider port with `issueRefund()` and `cancelSubscriptionNow()` methods
- Implemented automatic refund eligibility for Pro tier (14-day window from first payment)
- Added POST `/subscriptions/refund` endpoint for self-service refunds
- Enhanced GET `/subscriptions/status` with refund eligibility information
- All 32 unit tests passing (including 5 new refund-specific tests)

### Remaining Work
- [ ] Add API integration tests for refund endpoint
- [ ] Manual testing with Stripe test mode using test clock
- [ ] Add email notifications when refund is issued
- [ ] Create admin override endpoint for support team: `POST /admin/subscriptions/:userId/refund`
- [ ] Add refund analytics dashboard (refund rate, time-to-refund metrics)
- [ ] Extend to Enterprise tier with approval workflow
- [ ] Add Slack notifications for support team
- [ ] Document support playbook for handling refund requests

### Tech Debt Items
1. **No email notifications**: Users only see refund confirmation in UI (should email refund confirmation)
2. **No admin override**: Support can't manually issue refunds outside 14-day window (need override endpoint)
3. **No partial refunds**: Always full amount (may want admin capability for partial refunds)
4. **Enterprise excluded**: Manual process required (should have approval workflow in future)
5. **No refund rate analytics**: Can't track % of users who request refunds (add to dashboard)
6. **Limited dashboard regression tests**: Refund helper logic is unit-tested, but the `/dashboard/plan` component still lacks UI-level coverage; add component or Playwright tests once the harness is ready

### Migration Notes
- TODO: Add a backfill SQL migration that marks all existing Pro users as `refund_status='expired'`
- This migration must run before enabling refunds in production to prevent retroactive refund claims for users subscribed before feature launch
- New Pro subscriptions already get `refund_status='eligible'` on first payment via application logic

### Pricing Checkout Gap (Early Adopter Annual)
- Addressed: billingPeriod now flows UI → API → Stripe with `STRIPE_PRICE_PRO_ANNUAL`. Remaining action: set live annual price ID in prod secrets.

