# Usage Tracking and Monthly Runs Quota

**Date:** 2025-10-29
**Status:** Accepted

## Context

After implementing tier-based AI token quotas (ADR 0021), we had visibility into AI usage but lacked tracking for the most fundamental metric: **total endpoint executions per month**. This created several problems:

1. **Incomplete billing data**: No way to show users how many times their endpoints actually ran
2. **Missing quota enforcement**: While we limited AI tokens and endpoint count, users could still generate excessive execution costs through high-frequency baseline schedules
3. **Poor observability**: Users and admins couldn't see monthly execution trends without manually querying the runs table

The `/api/subscriptions/usage` endpoint returned AI token usage and endpoint counts, but not actual execution counts—the metric most directly tied to infrastructure costs (database writes, HTTP dispatches, logging).

## Decision

We implemented **monthly runs tracking with tier-based quota limits** following the same architectural pattern as AI token quotas.

### What Was Added

**1. Runs Quota Limits** (`packages/domain/src/quota/tier-limits.ts`):

Added `maxRunsPerMonth` to `TIER_EXECUTION_LIMITS`:

```typescript
export const TIER_EXECUTION_LIMITS = {
  free: {
    maxEndpoints: 10,
    minIntervalMs: 60_000,
    maxRunsPerMonth: 10_000,     // ~333 executions/day
  },
  pro: {
    maxEndpoints: 100,
    minIntervalMs: 10_000,
    maxRunsPerMonth: 100_000,    // ~3,333 executions/day
  },
  enterprise: {
    maxEndpoints: 1_000,
    minIntervalMs: 1_000,
    maxRunsPerMonth: 1_000_000,  // ~33,333 executions/day
  },
};
```

Created helper function:
```typescript
export function getRunsLimit(tier: UserTier): number {
  return TIER_EXECUTION_LIMITS[tier].maxRunsPerMonth;
}
```

**Quota Rationale**:
- Free tier: 10k runs/month is generous for testing/hobbyists while preventing abuse
- Pro tier: 100k runs/month supports small business production workloads
- Enterprise: 1M runs/month for high-volume applications
- Limits are separate from AI token quotas (runs can happen without AI analysis)

**2. Port Extension** (`packages/domain/src/ports/repos.ts`):

Extended `JobsRepo.getUsage()` return type:

```typescript
getUsage: (userId: string, since: Date) => Promise<{
  aiCallsUsed: number;
  aiCallsLimit: number;
  endpointsUsed: number;
  endpointsLimit: number;
  totalRuns: number;        // NEW: actual runs since date
  totalRunsLimit: number;   // NEW: monthly quota for tier
}>;
```

**3. Adapter Implementation** (`packages/adapter-drizzle/src/jobs-repo.ts`):

Extended `getUsage()` to query runs table:

```typescript
// Import new helper
const { getExecutionLimits, getTierLimit, getRunsLimit } = 
  await import("@cronicorn/domain");

// Get limit from tier
const totalRunsLimit = getRunsLimit(tier);

// Count runs since specified date (typically start of month)
const { runs } = await import("./schema.js");
const runsResult = await this.tx
  .select({ count: sql<number>`COUNT(*)::int` })
  .from(runs)
  .innerJoin(jobEndpoints, eq(runs.endpointId, jobEndpoints.id))
  .where(
    and(
      eq(jobEndpoints.tenantId, userId),
      sql`${runs.startedAt} >= ${since}`,
    ),
  );
const totalRuns = runsResult[0]?.count ?? 0;
```

**Key Implementation Details**:
- Uses same `since` parameter as AI token tracking (start of current month in API handler)
- Joins with `jobEndpoints` to filter by user's `tenantId`
- Returns 0 if no runs found (defensive)
- Query uses existing `runs.startedAt` timestamp—no schema changes needed

**4. Test Fixture** (`packages/domain/src/fixtures/in-memory-jobs-repo.ts`):

Updated in-memory implementation for test consistency:

```typescript
const totalRunsLimit = getRunsLimit(tier);
const totalRuns = 0; // In-memory doesn't track actual runs
```

**5. Service Layer** (`packages/services/src/jobs/manager.ts`):

Updated `JobsManager.getUsage()` return type to pass through new fields (no logic changes—service layer just delegates to repo).

**6. API Contract** (`packages/api-contracts/src/subscriptions/schemas.ts`):

Extended `UsageResponseSchema`:

```typescript
totalRuns: z.number().int().openapi({
  description: "Total number of endpoint executions since the start of the current period",
  example: 150,
}),
totalRunsLimit: z.number().int().openapi({
  description: "Maximum endpoint executions allowed per month for current tier",
  example: 10000,
}),
```

**7. UI Display** (`apps/web/src/routes/_authed/usage.tsx`):

Added "Total Runs" metric card:

```typescript
{
  title: "Total Runs",
  description: "Total endpoint executions this period",
  used: usage.totalRuns || 0,
  limit: usage.totalRunsLimit || 0,
}
```

Displays with same progress bar visualization as other quotas.

### Design Choices

**1. Count runs retroactively from `since` date instead of maintaining running counter**

Why:
- Reuses existing `runs` table (no new schema)
- Single source of truth for execution history
- Automatically handles month rollover (API passes start-of-month as `since`)
- Historical data preserved for analytics

Tradeoff: Requires COUNT query on each usage check, but acceptable for MVP scale. If performance becomes issue, add index: `CREATE INDEX idx_runs_started_at ON runs(started_at)`.

**2. Report usage but don't enforce quota (yet)**

Why:
- This ADR focuses on **visibility** (tracking + display)
- Enforcement requires deciding failure behavior: 
  - Pause all endpoints?
  - Skip scheduled runs?
  - Prevent new endpoint creation?
- Defer enforcement to future ADR when product requirements are clear

Current state: Users can see they've exceeded quota, but scheduler continues running. Future enhancement: add quota guard check before `claimDueEndpoints()` in scheduler loop.

**3. Same `since` parameter for AI tokens and runs**

Why:
- Both track monthly usage
- API handler calculates `startOfMonth` once and passes to `getUsage()`
- Consistent month boundary logic (UTC midnight on 1st)

**4. Separate limit from AI token quota**

Why:
- Runs can happen without AI analysis (baseline schedule only)
- Different cost models (runs = infrastructure, tokens = third-party API)
- Allows independent tier tuning (e.g., high runs / low AI for simple schedules)

## Consequences

### Positive

✅ **Complete usage visibility**: Dashboard now shows AI tokens, endpoints, and executions  
✅ **Billing foundation**: Accurate monthly run counts enable usage-based billing in future  
✅ **Quota transparency**: Users can see how close they are to tier limits  
✅ **Consistent architecture**: Follows same port/adapter pattern as AI token tracking  
✅ **Zero schema changes**: Reuses existing `runs` table with `startedAt` field  
✅ **Type-safe**: End-to-end types from repo → service → API → UI via Hono RPC

### Tradeoffs

⚠️ **Query performance**: COUNT aggregation on every usage check (mitigated: API caches response, users typically check usage page infrequently)  
⚠️ **No enforcement yet**: Quota displayed but not enforced (intentional—deferred to future ADR)  
⚠️ **Join query overhead**: Requires join with `jobEndpoints` to filter by user (acceptable—typically < 1000 endpoints per user)

### Future Enhancements

**Quota Enforcement** (requires new ADR):
- Add quota check in scheduler before claiming due endpoints
- Decide enforcement strategy: hard stop, graceful degradation, or billing overage
- Add proactive alerts (email/webhook) when approaching limit

**Performance Optimization**:
- Add index: `CREATE INDEX idx_runs_started_at_endpoint ON runs(endpoint_id, started_at)` for faster user-scoped queries
- Consider materialized view for monthly aggregates if usage checks become frequent
- Cache usage response for 5 minutes (most users check usage page < 1/min)

**Observability**:
- Add Prometheus metrics for runs/sec per tenant
- Dashboard charts showing run trends over time
- Alert when user exceeds 80% of quota

### What Changed (File Inventory)

**Domain Layer**:
- `packages/domain/src/quota/tier-limits.ts` (added `maxRunsPerMonth` and `getRunsLimit()`)
- `packages/domain/src/ports/repos.ts` (extended `getUsage()` return type)
- `packages/domain/src/fixtures/in-memory-jobs-repo.ts` (updated test fixture)

**Adapter Layer**:
- `packages/adapter-drizzle/src/jobs-repo.ts` (implemented runs counting query)

**Service Layer**:
- `packages/services/src/jobs/manager.ts` (updated return type, no logic changes)

**API Layer**:
- `packages/api-contracts/src/subscriptions/schemas.ts` (extended `UsageResponseSchema`)

**UI Layer**:
- `apps/web/src/routes/_authed/usage.tsx` (added Total Runs metric card)

**No Changes Needed**:
- API handler (`apps/api/src/routes/subscriptions/subscriptions.handlers.ts`) - already passes through manager response
- Database schema - reuses existing `runs` table
- Migrations - none required

## References

- ADR 0021: Tier-Based Quota Enforcement (established quota pattern for AI tokens and execution limits)
- Schema: `packages/adapter-drizzle/src/schema.ts` (runs table structure)
- Architecture doc: `.github/instructions/architecture.instructions.md` (port/adapter layering)
