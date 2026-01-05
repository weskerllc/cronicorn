
## TanStack Start Entry Files (Fixed - 2026-01-05)

**Status**: ✅ Fixed  
**Issue**: 502 Bad Gateway error on cronicorn.com production deployment  
**Root Cause**: Missing required TanStack Start entry files (`app/client.tsx`, `app/ssr.tsx`)

### Implementation Summary
- Created `app/` directory with required TanStack Start entry files:
  - `app/client.tsx` - Client-side hydration entry point with error handling
  - `app/ssr.tsx` - Server-side rendering entry point using default handler
- Updated `tsconfig.json` to include `app/**/*.tsx` files
- Verified build process and local server startup
- No Dockerfile changes needed (already configured to copy `.output` directory)

### Key Learnings
1. TanStack Start requires specific entry files in the `app/` directory
2. The `StartClient` component does not take a router prop (auto-discovered from file-based routing)
3. The server entry uses the default handler from `@tanstack/react-start/server-entry`
4. Build creates `.output/server/index.mjs` which is the production entry point
5. Error handling in hydration prevents silent failures in production

### References
- TanStack Start docs: https://tanstack.com/start/latest/docs/framework/react/quick-start
- Package: `@tanstack/react-start` v1.136.11
- Deployment platform: Dokploy

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

