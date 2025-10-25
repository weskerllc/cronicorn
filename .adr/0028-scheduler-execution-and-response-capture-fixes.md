# Scheduler Execution and Response Capture Fixes

**Date:** 2025-10-23
**Status:** Accepted

## Context

We discovered two critical bugs in the scheduler implementation that affected production behavior:

1. **Missing Response Data**: Despite `HttpDispatcher` correctly capturing HTTP `statusCode` and `responseBody`, run records in the database showed all these fields as `null`. Users viewing run details in the UI saw "No response body captured" for all executions.

2. **Premature Multiple Executions**: Endpoints with cron schedules were executing multiple times before their scheduled time. For example, an endpoint scheduled with `* * * * *` (every minute) at 17:10:00 would execute at:
   - 17:09:51 (9 seconds early)
   - 17:09:56 (4 seconds early)
   - 17:10:01 (1 second late)
   
   This resulted in 3x the expected execution rate.

### Root Causes

**Issue 1 - Missing Response Data:**
The data flow had a gap in the Scheduler's `handleEndpoint` method:
```typescript
// HttpDispatcher.execute() returns:
{ status, durationMs, statusCode, responseBody, errorMessage }

// But Scheduler only passed:
runs.finish(runId, { status: result.status, durationMs: result.durationMs })
// Missing: statusCode, responseBody, errorMessage
```

**Issue 2 - Premature Multiple Executions:**
The claim horizon mechanism (10 seconds) allows pre-claiming jobs for better scheduling guarantees. However, the lock management was flawed:

1. At 17:09:51, scheduler claims endpoint (nextRunAt=17:10:00 is within 10s horizon)
2. Executes successfully, sets `nextRunAt = 17:10:00` (correct per cron)
3. **Clears lock immediately** (`_lockedUntil = null`)
4. At 17:09:56 (next tick), endpoint is claimed AGAIN (17:10:00 still within horizon)
5. Repeats every 5 seconds until passing 17:10:00

The problem: locks were cleared immediately after execution, allowing re-claiming during the horizon window.

## Decision

### Fix 1: Complete Response Data Flow

Updated the full data flow to capture all execution results:

1. **Port Interface**: Extended `RunsRepo.finish()` signature to accept `statusCode` and `responseBody`
2. **Scheduler**: Modified `handleEndpoint()` to pass all fields from `ExecutionResult`
3. **Implementation**: `DrizzleRunsRepo.finish()` already supported these fields in the schema

### Fix 2: Persistent Lock Until Scheduled Time

Modified lock management in `DrizzleJobsRepo.updateAfterRun()`:

```typescript
// OLD: Cleared lock immediately
const updates = {
  lastRunAt: patch.lastRunAt,
  nextRunAt: patch.nextRunAt,
  failureCount: newFailureCount,
  _lockedUntil: null, // ❌ Allows immediate re-claiming
};

// NEW: Keep lock until nextRunAt
const lockUntil = patch.nextRunAt > now ? patch.nextRunAt : null;
const updates = {
  lastRunAt: patch.lastRunAt,
  nextRunAt: patch.nextRunAt,
  failureCount: newFailureCount,
  _lockedUntil: lockUntil, // ✅ Prevents re-claiming during horizon
};
```

This ensures:
- Endpoint cannot be claimed again until it's actually due
- Claim horizon still works for advance scheduling
- Distributed workers remain coordinated
- No duplicate executions within the horizon window

## Consequences

### Positive

- **Complete Observability**: All HTTP response data now captured and displayed in UI
- **Correct Execution Rate**: Endpoints execute at their configured schedule, not prematurely
- **Better Debugging**: Error messages, status codes, and response bodies available for troubleshooting
- **Maintained Architecture**: Fixes work within existing port/adapter design
- **No Breaking Changes**: Updates are additive and backward compatible

### Considerations

- Lock duration now extends to `nextRunAt`, which may be far in the future for infrequent jobs
  - This is acceptable: the lock only prevents claiming during the horizon window
  - Once horizon passes, the lock becomes irrelevant until nextRunAt approaches again
- Response body storage respects size limits (100KB default, configurable per endpoint)
- Database storage impact is minimal (JSON fields, indexed appropriately)

### Code Affected

**Domain Layer:**
- `packages/domain/src/ports/repos.ts` - RunsRepo.finish() signature

**Worker Layer:**
- `packages/worker-scheduler/src/domain/scheduler.ts` - handleEndpoint() data passing

**Adapter Layer:**
- `packages/adapter-drizzle/src/jobs-repo.ts` - updateAfterRun() lock management
- `packages/adapter-drizzle/src/runs-repo.ts` - finish() implementation (no changes needed)

## References

Related to scheduler execution flow and claim horizon mechanism. This is the third bug we've discovered in this area, indicating the need for deeper analysis of edge cases (see follow-up analysis in tech debt log).

**Architecture Reference**: `.github/instructions/architecture.instructions.md` (Governor, Scheduler, Claim Horizon)
