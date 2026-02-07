
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

## Rate Limiter: Redis Migration for Multi-Instance Deployment

**Status**: Planned tech debt
**File**: `apps/api/src/lib/rate-limiter.ts`
**Related**: Per-user API rate limiting implementation

### Current Implementation

The rate limiter uses an in-memory `Map`-based sliding window algorithm:
- Keyed by `userId` for per-user rate limiting
- Separate limits for mutations (60 rpm default) and reads (120 rpm default)
- Periodic cleanup to prevent memory leaks from inactive users
- Suitable for **single-instance deployments only**

### Problem with Horizontal Scaling

When running multiple API instances (load-balanced), each instance maintains its own rate limit state:
- User hitting instance A won't share rate limit state with instance B
- Effective rate limit becomes `configured_limit × number_of_instances`
- Defeats the purpose of rate limiting for abuse prevention

### Migration Path to Redis

1. **Replace `Map` with Redis**:
   - Use Redis INCR with EXPIRE for atomic increment-with-expiry
   - Or use Redis Lua scripts for sliding window calculation
   - Key format: `ratelimit:{userId}:{limiterType}:{windowId}`

2. **Implementation options**:
   - **Simple fixed window**: `INCR` + `EXPIRE` (less accurate, simpler)
   - **Sliding window log**: `ZADD` + `ZRANGEBYSCORE` (more accurate, higher Redis load)
   - **Sliding window counter**: Two keys per user (current + previous window counts)

3. **Recommended approach** (sliding window counter):
   ```
   KEY: ratelimit:{userId}:{type}:{window}
   Commands:
   - INCR to increment current window
   - GET previous window count
   - Calculate effective count in application
   - Use EXPIRE to auto-cleanup old windows
   ```

4. **Configuration changes**:
   - Add `REDIS_URL` environment variable (may already exist)
   - Add `RATE_LIMIT_STORAGE` env var: `memory` | `redis` (default: `memory`)
   - Feature flag for gradual rollout

### Required Changes

| File | Change |
|------|--------|
| `apps/api/src/lib/rate-limiter.ts` | Add `RedisRateLimiter` class implementing same interface |
| `apps/api/src/lib/config.ts` | Add `RATE_LIMIT_STORAGE` config option |
| `apps/api/src/app.ts` | Conditionally create Redis or Map-based limiter |
| `apps/api/package.json` | Add Redis client dependency (ioredis or similar) |

### Acceptance Criteria for Migration

- [ ] Rate limit state is shared across all API instances
- [ ] Fallback to in-memory limiter if Redis is unavailable (graceful degradation)
- [ ] No increase in p99 latency beyond 5ms for rate limit checks
- [ ] Existing rate limit tests pass with Redis storage
- [ ] Add integration tests with Redis testcontainers

### When to Prioritize

Migrate to Redis when:
- Deploying to multiple API instances (horizontal scaling)
- Experiencing rate limit bypass due to load balancing
- Adding Redis for other features (caching, sessions, queues)

---

## Dashboard time range alignment
**Status**: Identified

- DashboardManager now requires `startDate`/`endDate` inputs, but time-series generation still anchors to `clock.now()` instead of the provided `endDate`. If callers ever ask for historical windows (not ending "now"), returned series will be misaligned with the requested range.
- Action: Confirm consumer contract (should `endDate` always be `now`?). If not, update manager to anchor buckets to `endDate` and add tests for non-now ranges.

---

## Sentry Integration for Error Tracking

**Status**: Planned tech debt
**Related**: Task 6 - Observability (request logging, health checks, exception handlers)

### Current State

Basic observability is now in place:
- ✅ Request ID middleware generates UUIDs and adds `X-Request-Id` header
- ✅ Structured request logging via Pino (method, path, status, duration, requestId, userId)
- ✅ Health endpoint pings database with 2s timeout
- ✅ Uncaught exception/rejection handlers in all 3 apps (api, scheduler, ai-planner)

However, errors are only logged locally. There's no centralized error tracking or alerting.

### Why Sentry

Sentry provides:
- **Centralized error aggregation**: All errors from all apps in one dashboard
- **Stack trace deobfuscation**: Source maps for readable production stack traces
- **Error grouping**: Automatically deduplicate similar errors
- **Alerting**: Slack/email notifications for new or regression errors
- **Release tracking**: Correlate errors with deployments
- **Performance monitoring**: Optional tracing for slow requests
- **User context**: Associate errors with user IDs for debugging

### Implementation Plan

1. **Install Sentry SDK**:
   ```bash
   pnpm add @sentry/node @sentry/profiling-node --filter @cronicorn/api
   pnpm add @sentry/node --filter @cronicorn/scheduler
   pnpm add @sentry/node --filter @cronicorn/ai-planner
   ```

2. **Initialize early in each app** (before other imports):
   ```typescript
   import * as Sentry from "@sentry/node";

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     release: process.env.APP_VERSION,
     tracesSampleRate: 0.1, // 10% of requests for performance monitoring
   });
   ```

3. **Enhance existing exception handlers**:
   ```typescript
   process.on("uncaughtException", (error) => {
     logger.fatal({ err: error }, "Uncaught exception");
     Sentry.captureException(error);
     Sentry.close(2000).then(() => process.exit(1));
   });
   ```

4. **Add Hono middleware for API**:
   ```typescript
   import { setupHonoErrorHandler } from "@sentry/node";

   // After other middleware
   setupHonoErrorHandler(app);
   ```

5. **Attach user context in auth middleware**:
   ```typescript
   Sentry.setUser({ id: userId, email: userEmail });
   ```

6. **Add request ID to Sentry scope**:
   ```typescript
   Sentry.setTag("request_id", requestId);
   ```

### Required Changes

| File | Change |
|------|--------|
| `apps/api/package.json` | Add `@sentry/node` dependency |
| `apps/scheduler/package.json` | Add `@sentry/node` dependency |
| `apps/ai-planner/package.json` | Add `@sentry/node` dependency |
| `apps/api/src/index.ts` | Initialize Sentry, enhance exception handlers |
| `apps/api/src/app.ts` | Add Sentry error handler middleware |
| `apps/api/src/middleware/auth.ts` | Set Sentry user context |
| `apps/api/src/lib/request-id.ts` | Set Sentry request_id tag |
| `apps/scheduler/src/index.ts` | Initialize Sentry, enhance exception handlers |
| `apps/ai-planner/src/index.ts` | Initialize Sentry, enhance exception handlers |
| `.env.example` | Add `SENTRY_DSN` placeholder |

### Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `SENTRY_DSN` | Sentry project DSN from dashboard | Yes |
| `SENTRY_ENVIRONMENT` | Environment name (production, staging) | Optional (defaults to NODE_ENV) |
| `SENTRY_TRACES_SAMPLE_RATE` | Performance monitoring sample rate (0-1) | Optional (default: 0.1) |

### Acceptance Criteria

- [ ] Sentry SDK initialized in all 3 apps (api, scheduler, ai-planner)
- [ ] Uncaught exceptions are captured and sent to Sentry before process exit
- [ ] API errors include request ID and user ID in Sentry context
- [ ] Source maps uploaded to Sentry for readable stack traces
- [ ] Slack alert configured for new production errors
- [ ] Test error endpoint (`/api/debug/sentry`) available in non-production for verification

### When to Prioritize

Implement Sentry when:
- Preparing for production launch
- Team size grows and centralized error visibility is needed
- On-call rotation is established and alerting is required
- Debugging production issues becomes time-consuming without aggregated errors

