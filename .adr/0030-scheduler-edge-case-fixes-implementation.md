# Scheduler Edge Case Fixes: Configurable Lock Duration and Zombie Run Cleanup

**Date:** 2025-01-01  
**Status:** Accepted

## Context

Following the comprehensive edge case analysis documented in ADR-0029, we identified two CRITICAL issues affecting scheduler reliability:

**Issue 1: Fixed Lock Duration Insufficient for Long-Running Jobs**
- Lock duration hardcoded to 60 seconds in `claimDueEndpoints`
- Long-running jobs (ML training, data processing, large exports) take >60s
- Once lock expires, endpoint becomes claimable again while still executing
- Results in duplicate execution with resource conflicts and data corruption

**Issue 2: Worker Crashes Leave Zombie Runs**
- Worker crashes/restarts leave runs stuck in "running" state indefinitely
- No cleanup mechanism to detect and mark these orphaned runs
- Degrades observability (metrics show phantom "running" jobs)
- Manual database intervention required to clean up

Both issues were discovered during production testing with real-world workloads. They represent edge cases that violate core system guarantees (execute-once semantics and accurate state tracking).

**Task Tracking:** Implementation details tracked in `.tasks/scheduler-edge-case-fixes.md` with hierarchical TASK-X.Y.Z identifiers.

## Decision

We implemented two coordinated fixes to address these critical issues:

### 1. Configurable Lock Duration (TASK-1)

**What:** Add `maxExecutionTimeMs` field to `JobEndpoint` entity, allowing users to specify expected execution time for lock duration calculation.

**How:**
- Added optional `maxExecutionTimeMs` field to domain entity
- Created migration `0006_next_thor_girl.sql` to add database column
- Updated `claimDueEndpoints` to calculate lock duration as max of batch
- API validation enforces 30-minute maximum (1,800,000ms)
- Defaults to 60 seconds if not specified

**Lock Calculation Logic:**
```typescript
// All claimed endpoints get same lock duration (max of batch)
const maxLockDuration = claimed.reduce((max, ep) => 
  Math.max(max, ep.maxExecutionTimeMs ?? 60000), 
  Math.max(withinMs, 60000)  // At least horizon window
);
const lockUntil = new Date(nowMs + maxLockDuration);
```

**Rationale:** Using max-of-batch simplifies implementation (single SQL UPDATE) while still preventing double-execution. Short jobs get slightly longer locks than needed, but this is an acceptable tradeoff for simplicity.

### 2. Zombie Run Cleanup (TASK-2)

**What:** Periodic background task identifies and marks stale "running" runs as failed.

**How:**
- Added `cleanupZombieRuns(olderThanMs: number): Promise<number>` to `RunsRepo` port
- Implemented in `DrizzleRunsRepo` with two-query approach (select → update)
- Integrated into `Scheduler` worker with 5-minute interval loop
- Configuration via environment variables:
  - `CLEANUP_INTERVAL_MS` (default: 300000 = 5 minutes)
  - `ZOMBIE_RUN_THRESHOLD_MS` (default: 3600000 = 1 hour)

**Cleanup Logic:**
```typescript
// 1. Find zombies (running longer than threshold)
const zombies = await tx.select({ id: runs.id })
  .from(runs)
  .where(and(
    eq(runs.status, "running"),
    lte(runs.startedAt, threshold)
  ));

// 2. Mark as failed with descriptive error
await tx.update(runs)
  .set({
    status: "failed",
    finishedAt: new Date(),
    errorMessage: "Worker crashed or timed out (no response after threshold)"
  })
  .where(inArray(runs.id, zombieIds));
```

**Rationale:** Conservative 1-hour threshold avoids false positives for legitimate long jobs. Periodic cleanup (vs immediate detection) balances responsiveness with database load. Descriptive error message aids debugging.

## Implementation Choices

### Max-of-Batch Locking (vs Per-Endpoint Updates)

**Chosen:** Calculate max `maxExecutionTimeMs` from entire batch, apply same lock to all endpoints.

**Alternative:** Update each endpoint with its specific lock duration.

**Reasoning:**
- Simpler: One SQL UPDATE vs N updates
- Good enough: Short jobs get longer locks but still safe
- Performance: Fewer database round-trips
- YAGNI principle: Optimize when we have evidence it matters

### Periodic Cleanup (vs Heartbeat Mechanism)

**Chosen:** Background task runs every 5 minutes, checks for runs older than threshold.

**Alternative:** Workers send periodic heartbeats during execution; lack of heartbeat triggers cleanup.

**Reasoning:**
- Simpler: No heartbeat logic in scheduler worker
- Less network: No constant pinging
- Acceptable latency: 1-5 minute delay before zombie detected is fine
- Boring solution: Proven pattern (cron-style cleanup)

### Two-Query Cleanup (vs Single UPDATE)

**Chosen:** SELECT zombies first, then UPDATE with zombie IDs.

**Alternative:** Single UPDATE with subquery.

**Reasoning:**
- Clarity: Explicit about what's being updated
- Return count: Easy to count affected rows for logging
- Transactional: Still atomic within transaction scope
- Debuggable: Can inspect zombie IDs before updating

## Consequences

### Positive

- ✅ **Prevents double-execution** for long-running jobs (ML training, large exports, complex processing)
- ✅ **Automatic zombie cleanup** improves observability and eliminates manual intervention
- ✅ **User-configurable** via API field (no code changes needed per job type)
- ✅ **Backward compatible**: New field optional, cleanup configurable, safe defaults
- ✅ **Test coverage added**: 3 integration tests verify SQL behavior (lock duration, zombie detection, empty case)
- ✅ **Coverage improvement**: `runs-repo.ts` went from 87.19% to 94.8% statement coverage

### Negative

- ⚠️ **New configuration knobs**: Operators must understand `CLEANUP_INTERVAL_MS` and `ZOMBIE_RUN_THRESHOLD_MS`
- ⚠️ **Batch locking tradeoff**: Short jobs might hold locks longer than needed (acceptable for simplicity)
- ⚠️ **Cleanup delay**: 1-5 minute window before zombie detected (not instant, but acceptable)
- ⚠️ **Schema change**: Migration required (additive, no breaking changes)

### Code Affected

**Domain Layer:**
- `packages/domain/src/entities/endpoint.ts`: Added `maxExecutionTimeMs?: number` field
- `packages/domain/src/ports/repos.ts`: Added `cleanupZombieRuns` method to `RunsRepo` interface, updated `finish()` signature
- `packages/domain/src/fixtures/in-memory-runs-repo.ts`: Implemented cleanup for test compatibility

**Adapter Layer:**
- `packages/adapter-drizzle/src/schema.ts`: Added `max_execution_time_ms` column
- `packages/adapter-drizzle/migrations/0006_next_thor_girl.sql`: Migration for new column
- `packages/adapter-drizzle/src/jobs-repo.ts`: Updated `claimDueEndpoints` with max-of-batch lock calculation, updated `rowToEntity` mapper, updated `updateEndpoint` method
- `packages/adapter-drizzle/src/runs-repo.ts`: Implemented `cleanupZombieRuns` with two-query approach

**Worker Layer:**
- `packages/worker-scheduler/src/domain/scheduler.ts`: Added `cleanupZombieRuns` method to `IScheduler` interface and `Scheduler` class
- `apps/scheduler/src/index.ts`: Added cleanup interval loop with configuration

**API Contracts:**
- `packages/api-contracts/src/jobs/schemas.ts`: Added `maxExecutionTimeMs` validation (max 30 minutes)

**Tests:**
- `packages/adapter-drizzle/src/tests/contracts/drizzle.test.ts`: Added 3 integration tests
- `packages/services/src/dashboard/__tests__/manager.test.ts`: Updated mock with `cleanupZombieRuns`
- `packages/services/src/jobs/__tests__/manager.test.ts`: Updated mock with `cleanupZombieRuns`

## Alternatives Considered

### Exponential Backoff for Cleanup Interval

**What:** Start with fast cleanup checks (e.g., every 30s), then slow down if no zombies found.

**Why rejected:** YAGNI - fixed 5-minute interval is simple and works fine. No evidence that constant 5-minute checks cause issues. Can optimize later if database load becomes a concern.

### Immediate Cleanup on Claim

**What:** Check for zombies during each `claimDueEndpoints` call.

**Why rejected:** Adds latency to critical path (scheduler tick). Cleanup can be slower without affecting execution. Separation of concerns: claiming vs cleanup are orthogonal.

### Heartbeat + TTL Pattern

**What:** Workers send periodic heartbeats; runs without recent heartbeat are considered zombies.

**Why rejected:** Over-engineering for current scale. Adds complexity (heartbeat logic, TTL tracking). Periodic cleanup is simpler and sufficient. Could revisit if we need sub-minute zombie detection.

### Per-Job Lock Duration Configuration

**What:** Allow different lock durations per job (not just per endpoint).

**Why rejected:** Too granular - endpoints within a job can have different execution times. User configures per-endpoint via API, which is the right level of granularity.

## Testing

### Integration Tests (Drizzle Adapter)

Added to `packages/adapter-drizzle/src/tests/contracts/drizzle.test.ts`:

1. **cleanupZombieRuns with mixed runs**: Creates old running run, recent running run, and finished run. Verifies only old running run marked as failed.

2. **cleanupZombieRuns empty case**: Verifies cleanup returns 0 when no zombies exist.

3. **claimDueEndpoints with maxExecutionTimeMs**: Creates two endpoints with different `maxExecutionTimeMs` values. Verifies both get locked until max of batch (5 minutes).

### Coverage Improvement

- **Before:** `runs-repo.ts` at 87.19% statement coverage
- **After:** `runs-repo.ts` at 94.8% statement coverage
- **Full suite:** 227 tests passing (20 drizzle integration tests)

### Test Approach

- Real PostgreSQL database (transaction-per-test isolation)
- Verify SQL behavior (not just TypeScript logic)
- Assert on observable outcomes (status, error messages, lock times)
- Timezone-agnostic assertions (relative time checks)

## Configuration

### New Environment Variables

```bash
# Scheduler Worker (apps/scheduler/src/index.ts)
CLEANUP_INTERVAL_MS=300000      # How often to check for zombies (default: 5 minutes)
ZOMBIE_RUN_THRESHOLD_MS=3600000 # Mark as zombie if running > threshold (default: 1 hour)
```

### API Field

```typescript
// POST /api/jobs/:jobId/endpoints
{
  "name": "Heavy Processing Endpoint",
  "url": "https://api.example.com/process",
  "maxExecutionTimeMs": 300000  // 5 minutes (optional, default: 60000)
}
```

**Validation:**
- Must be positive integer
- Maximum 1,800,000ms (30 minutes)
- If omitted, defaults to 60,000ms (60 seconds)

## Rollback Plan

If issues arise in production:

1. **Lock duration:** Revert to hardcoded 60s by removing `maxExecutionTimeMs` usage in `claimDueEndpoints` (keep database column for future use).

2. **Cleanup:** Disable cleanup interval by commenting out loop in `apps/scheduler/src/index.ts` (no data loss, just stops automatic cleanup).

3. **Database:** Migration is additive (new column nullable). Can be ignored without breaking existing functionality.

No breaking changes - all features are additive and backward compatible.

## References

- **ADR-0029**: Scheduler Edge Case Analysis (identified these CRITICAL issues)
- **ADR-0028**: Scheduler Execution and Response Capture Fixes (related scheduler improvements)
- **Task Doc**: `.tasks/scheduler-edge-case-fixes.md` (detailed implementation plan)
- **Task IDs**: TASK-1.1 through TASK-1.6 (configurable lock duration), TASK-2.1 through TASK-2.4 (zombie run cleanup)
- **Migration**: `0006_next_thor_girl.sql`
- **Tests**: `packages/adapter-drizzle/src/tests/contracts/drizzle.test.ts`

## Future Considerations

### Observability Enhancements (TASK-3)

Not yet implemented (lower priority):
- Structured logging for lock events (which endpoints claimed, lock durations)
- Metrics for duplicate execution detection (warn if endpoint runs within 5s of last run)
- Dashboard visualization of zombie cleanup events

### Documentation (TASK-4)

Not yet implemented (lower priority):
- Update API documentation with `maxExecutionTimeMs` field usage examples
- Add code comments explaining cleanup logic and lock duration calculation
- User guide for configuring cleanup thresholds based on workload

These enhancements improve developer experience and debugging but don't affect core functionality. Can be added incrementally as needs arise.

## Lessons Learned

1. **Edge cases matter at scale**: Fixed lock duration worked fine in testing but failed with real-world long-running jobs.

2. **Cleanup is operational hygiene**: Every "running" state needs a cleanup mechanism for worker crashes.

3. **Conservative thresholds**: 1-hour zombie threshold avoids false positives while still being fast enough for debugging.

4. **Test SQL behavior**: Integration tests with real database caught column naming issues and timezone bugs.

5. **Simplicity wins**: Max-of-batch locking and periodic cleanup are simple patterns that work reliably.
