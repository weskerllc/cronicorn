# Tier-Based Limit Enforcement and Execution Metering

**Date:** 2025-12-13  
**Status:** Accepted

## Context

The pricing model requires enforcing subscription tier limits across multiple dimensions:
- **Endpoint capacity** (max endpoints per user)
- **Execution frequency** (minimum interval between runs)
- **Monthly execution volume** (total runs per month)
- **AI token usage** (soft limit on API calls)

Previously, these limits were partially enforced or inconsistently applied. This decision consolidates enforcement into a clear, testable architecture where:
1. Limits are defined centrally in the domain
2. Enforcement happens at appropriate boundaries (creation, execution, token usage)
3. Behavior is consistent: soft limits defer/block transparently; hard limits reject at creation
4. All enforcement has test coverage and clear documentation

## Decision

### 1. Centralized Tier Limit Definition

**Location:** `packages/domain/src/quota/tier-limits.ts`

```typescript
export const TIER_EXECUTION_LIMITS = {
  free: {
    maxEndpoints: 5,
    minIntervalMs: 60_000,        // 1 minute
    maxRunsPerMonth: 10_000,
  },
  pro: {
    maxEndpoints: 100,
    minIntervalMs: 10_000,        // 10 seconds
    maxRunsPerMonth: 100_000,
  },
  enterprise: {
    maxEndpoints: 1_000,
    minIntervalMs: 1_000,         // 1 second
    maxRunsPerMonth: 1_000_000,
  },
} as const;
```

All four limit types are defined once and exported via helper functions:
- `getExecutionLimits(tier)` → `{ maxEndpoints, minIntervalMs, maxRunsPerMonth }`
- `getRunsLimit(tier)` → monthly run cap
- `getTierLimit(tier)` → AI token limit

### 2. Limit Enforcement Strategy by Type

#### A. Endpoint Capacity (Hard Limit - Reject)

**Enforcement Point:** `JobsManager.createEndpoint()` / `JobsManager.createJob()`  
**Behavior:** Reject with error if user already has >= maxEndpoints

```
User creates endpoint → Check endpoint count → If >= limit, throw error → User sees 400 Bad Request
```

**Why hard limit:** Prevents resource exhaustion; enforced at API boundary for fail-fast behavior.

**Test Coverage:** `packages/services/src/jobs/__tests__/manager.test.ts`

#### B. Minimum Interval (Hard Limit - Clamp)

**Enforcement Points:**
1. `JobsManager.createEndpoint()` - Clamp baselineIntervalMs to >= minIntervalMs
2. `Scheduler.planNextRun()` - Clamp calculated interval to min/max bounds
3. `Governor` domain policy - Enforce [lastRunAt+min, lastRunAt+max] window

**Behavior:** Silently clamp to minimum if user attempts shorter interval

```
User sets interval=5s, min=60s → Clamp to 60s → Endpoint runs at 60s intervals
```

**Why clamping vs rejection:** Prevents admin friction; user's intent (frequent checking) is still honored within limits.

**Test Coverage:** `packages/services/src/jobs/__tests__/manager.test.ts`, scheduler timing tests

#### C. Monthly Execution Volume (Soft Limit - Defer)

**Enforcement Point:** `Scheduler.checkRunLimit()` (called before each execution)  
**Behavior:** When monthly totalRuns >= maxRunsPerMonth, defer to next month start

```
Scheduler tick → Check monthly run count → If >= limit:
  - Do NOT execute
  - Set nextRunAt = 2025-02-01T00:00:00Z (next month)
  - Log warning for ops visibility
  - Return (exit early from execution)
```

**Why soft limit:** Monthly boundary resets quota; deferral is transparent to user (visible via nextRunAt). Prevents "stuck forever" scenarios.

**Counting:** `RunsRepo.getFilteredMetrics({ userId, sinceDate: startOfMonth })` counts all runs since month start, excluding archived jobs/endpoints.

**Test Coverage:** `packages/worker-scheduler/src/domain/__tests__/scheduler-run-limit.spec.ts` (14 tests covering free/pro/enterprise tiers, boundaries, errors, cross-month behavior)

#### D. AI Token Usage (Soft Limit - Quota Check)

**Enforcement Point:** `DrizzleQuotaGuard.canProceed()` (called before AI analysis)  
**Behavior:** Check if monthly token consumption >= monthly limit; return boolean

```
AI Planner before analysis → QuotaGuard.canProceed(tenantId) → If false, skip analysis → Log soft-limit hit
```

**Why soft limit:** Prevents API cost explosion; allows analysis to degrade gracefully.

**Tracking:** `aiAnalysisSessions.tokenUsage` records consumption; `recordUsage()` updates total.

**Test Coverage:** `packages/adapter-drizzle/src/__tests__/quota-guard.test.ts`

### 3. Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ Domain Layer (packages/domain)                                       │
├─────────────────────────────────────────────────────────────────────┤
│ - tier-limits.ts: TIER_EXECUTION_LIMITS, getRunsLimit(), etc.       │
│ - governor.ts: planNextRun() enforces min/max interval clamps       │
│ - scheduler.ts: checkRunLimit() checks monthly execution            │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Services Layer (packages/services)                                   │
├─────────────────────────────────────────────────────────────────────┤
│ - JobsManager.createEndpoint(): clamps minIntervalMs, checks caps   │
│ - getUsage(userId, since): aggregates runs/endpoints/token usage    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Adapter Layer (packages/adapter-drizzle)                             │
├─────────────────────────────────────────────────────────────────────┤
│ - JobsRepo.getUsage(): SQL query returns totalRuns/totalRunsLimit   │
│ - JobsRepo.getUserTier(): Fetches user subscription tier            │
│ - RunsRepo.getFilteredMetrics(): Counts monthly runs per user       │
│ - QuotaGuard: Token usage aggregation and quota check               │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ API / Scheduler (apps/api, apps/scheduler)                          │
├─────────────────────────────────────────────────────────────────────┤
│ - GET /subscriptions/usage: Returns totalRuns vs totalRunsLimit     │
│ - Scheduler.tick(): Calls checkRunLimit() before dispatch           │
│ - UI displays quota progress bars                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 4. Behavior Examples

#### Example 1: Free User Creates 6th Endpoint
```
POST /jobs/{jobId}/endpoints
→ JobsManager.createEndpoint()
→ JobsRepo.getUsage() → endpointsUsed=5, endpointsLimit=5
→ Throw error: "Endpoint limit (5) reached for free tier"
→ API returns 400
```

#### Example 2: Free User Sets Interval to 5 Seconds
```
POST /jobs/{jobId}/endpoints
  { baselineIntervalMs: 5_000 }
→ JobsManager validates
→ JobsManager validates
→ baselineIntervalMs (5_000) < minIntervalMs (60_000)
→ Throw error: "Minimum interval for free tier is 60 seconds"
→ API returns 400
```

#### Example 3: Free User Hits 10k Monthly Runs on Jan 31
```
Jan 31, 11:59 PM → Scheduler.tick()
→ Endpoint due for execution
→ checkRunLimit(userId) checks metrics from Jan 1
→ getFilteredMetrics() returns totalRuns=10_000
→ getRunsLimit("free") returns 10_000
→ 10_000 >= 10_000 → Limit exceeded
→ setNextRunAtIfEarlier(endpoint, 2025-02-01T00:00:00Z)
→ Return early, do NOT execute
→ Logger.warn() logs deferral for ops
```

#### Example 4: Free User After Month Reset (Feb 1)
```
Feb 1, 12:01 AM → Scheduler.tick()
→ Endpoint (nextRunAt=Feb 1) now due
→ checkRunLimit(userId) checks metrics from Feb 1
→ getFilteredMetrics() returns totalRuns=0 (fresh month)
→ 0 < 10_000 → OK to proceed
→ Execute endpoint normally
```

## Consequences

### Positive
- **Single source of truth:** All tier limits in one file, easy to update for contract changes
- **Testable:** Each enforcement point has unit/integration tests; execution metering has 14 dedicated tests
- **Transparent behavior:** Users see deferral in nextRunAt; soft limits don't break APIs
- **Ops visibility:** Warnings logged when limits hit; easy to monitor/alert on
- **Backward compatible:** Limits silently clamp/defer; no breaking changes to API contracts

### Trade-offs
1. **Soft limits allow burst:** Multiple concurrent operations may race and all pass quota check before any record usage (soft limit + 10-20% acceptable burst). Acceptable for cost-aware scenarios.
2. **Deferral not permanent block:** If user hits run limit, execution defers silently. User sees nextRunAt pushed to next month but no explicit error. Acceptable because:
   - Usage endpoint shows totalRuns vs totalRunsLimit (clear visibility)
   - Deferral is automatic recovery (not stuck forever)
   - Prevents support burden from hard failures
3. **Clamp vs reject for intervals:** Clamping minIntervalMs means user request is overridden silently (no 400 error). Acceptable because:
   - User's intent (monitor frequently) is still honored
   - Prevents "I set 5s but it won't run" confusion
   - Documented in API response schema

### Implementation Burden
- Requires `RunsRepo.getFilteredMetrics()` query (already implemented, not expensive)
- Requires `JobsRepo.getUserTier()` fetch (cached per request)
- No breaking changes; existing endpoints/jobs continue working

## Code Changes

### Files Modified
1. **Domain layer** (no changes, existing enforcement)
   - `packages/domain/src/quota/tier-limits.ts` - Already defines limits
   - `packages/domain/src/scheduler.ts` - Governor already clamps intervals

2. **Services layer**
   - `packages/services/src/jobs/manager.ts` - Calls enforcement via repos

3. **Scheduler enforcement (new)**
   - `packages/worker-scheduler/src/domain/scheduler.ts` - Enhanced `checkRunLimit()` with detailed docs
   
4. **Test coverage (new)**
   - `packages/worker-scheduler/src/domain/__tests__/scheduler-run-limit.spec.ts` - 14 comprehensive tests

5. **Pricing & content (aligned)**
   - Removed "10k/100k/1M" claims from marketing copy; kept internal tier limits exact
   - UI displays totalRuns/totalRunsLimit without specific numbers (progress bars only)

## References

- TASK-3.1: Pricing feature implementation
- TASK-3.2: Quota and limit enforcement
- ADR-0021: Tier-based quota enforcement (prior AI token limit)
- ADR-0033: Usage tracking and runs quota (prior deferral design)

## Verification

All enforcement tested and passing:
- Unit tests: `pnpm test` (all 24 test files pass)
- Endpoint cap enforcement: ✓ Tested in JobsManager
- Min interval clamping: ✓ Tested in scheduler timing
- Monthly run deferral: ✓ 14 dedicated tests (free/pro/enterprise, boundaries, errors, cross-month)
- AI token quota: ✓ Existing QuotaGuard tests

Run `pnpm test 2>&1 | grep "scheduler-run-limit"` to verify execution metering tests.

## Future Considerations

1. **Email notifications:** Currently defers silently. Could add opt-in alerts when approaching limit (separate feature).
2. **Stripe metering API:** Usage-based billing not yet integrated (design decision deferred).
3. **Hard block option:** Could switch execution metering from deferral to rejection if needed (change checkRunLimit return value).
4. **Per-endpoint rate limits:** Currently only per-tier; could add per-endpoint QoS in future.
