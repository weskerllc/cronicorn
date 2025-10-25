# Fix Scheduler Timing Issues and Claim Horizon

**Date:** 2025-10-22  
**Status:** Accepted

## Context

The scheduler had multiple critical bugs causing endpoints to run every 5 seconds instead of their configured intervals:

### Problem 1: Claim Horizon Too Large
The scheduler used a 60-second "claim horizon" (how far ahead to look for due endpoints). With 5-second ticks, this meant any endpoint with interval ≤60s would be claimed on every tick, causing tight retry loops.

### Problem 2: Stale `lastRunAt` in Interval Calculations
When `planNextRun` calculated `nextRunAt = lastRunAt + interval`, it used the stale `lastRunAt` from the database. After execution, the scheduler would update `lastRunAt = executionStartTime`, creating a mismatch where `nextRunAt` was based on old data.

**Example:**
- DB has `lastRunAt = 20:46:41`
- Execution starts at 20:47:36
- `planNextRun` calculates: `nextRunAt = 20:46:41 + 60s = 20:47:41`
- Scheduler updates: `lastRunAt = 20:47:36` (current execution)
- Result: Only 5 seconds between `lastRunAt` and `nextRunAt`!

### Problem 3: Slow Executions Creating Past Timestamps  
When execution took longer than the interval, `nextRunAt` (calculated from start time) would be in the past by completion time, causing immediate re-claiming.

**Example with 15s interval:**
- Execution starts at 20:50:34, calculates `nextRunAt = 20:50:49`
- Execution takes 20 seconds, finishes at 20:50:54
- `nextRunAt` (20:50:49) is now 5 seconds in the PAST
- Next tick immediately claims it again

Related task IDs: TASK-2.3 (scheduler implementation)

## Decision

### Fix 1: Reduce Claim Horizon (ADR-0024)
Changed `CLAIM_HORIZON_MS` from 60000ms (60s) to 10000ms (10s) and renamed from `LOCK_TTL_MS` for clarity.

**Files changed:**
- `apps/scheduler/src/index.ts`: Default changed from 60s → 10s
- `packages/adapter-drizzle/src/jobs-repo.ts`: Separated lock duration (60s minimum) from claim horizon

### Fix 2: Use Current Execution Time for Interval Calculations
Changed `planNextRun` to always use `now` (current execution time) as the base for interval calculations, matching what the scheduler sets as `lastRunAt`.

**Files changed:**
- `packages/domain/src/governor/plan-next-run.ts`: 
  ```typescript
  // Before: const last = j.lastRunAt ?? now;
  // After: const lastMs = nowMs;  // Always use current execution time
  ```

This ensures interval calculations match the `lastRunAt` value that will be written to the database.

### Fix 3: Safety Check for Slow Executions
Added a safety check in the scheduler that detects when `nextRunAt` would be in the past and reschedules using the originally intended interval.

**Files changed:**
- `packages/worker-scheduler/src/domain/scheduler.ts`:
  ```typescript
  const currentTime = clock.now();
  if (plan.nextRunAt.getTime() < currentTimeMs) {
    // Preserve the intended interval, just shift from completion time
    const intendedIntervalMs = Math.max(
      plan.nextRunAt.getTime() - now.getTime(), 
      1000  // Minimum 1 second safety
    );
    safeNextRunAt = new Date(currentTimeMs + intendedIntervalMs);
  }
  ```

This respects the scheduling policy (baseline, AI hints, backoff) while preventing tight retry loops.

## Consequences

### Positive

**Correct interval timing:**
- Endpoints now run at their configured intervals
- No more tight 5-second retry loops
- Handles both fast and slow executions correctly

**Policy-aware rescheduling:**
- Safety check uses the intended interval from `planNextRun`
- Respects AI hints, exponential backoff, and all scheduling policies
- Maintains "start-to-start" interval semantics when possible

**Better separation of concerns:**
- Claim horizon (10s) determines how early endpoints can be claimed
- Lock duration (60s minimum) prevents concurrent execution  
- These are now clearly distinct concepts

### Negative

**Intervals can vary by ±claim horizon:**
- With 10s claim horizon, a 60s interval might actually be 50-60s
- This is acceptable for most use cases but worth noting
- Users needing strict timing can reduce claim horizon further

**Slow executions delay next run:**
- If execution takes longer than interval, next run is pushed back
- This prevents overwhelming slow endpoints but can cause drift
- Documented in code comments

### Trade-offs Made

**Start-to-start vs completion-to-start intervals:**
- Chose "start-to-start" (fixed intervals from execution start time)
- With safety floor for slow executions (reschedule from completion)
- Alternative would be "minimum gap" (always wait full interval after completion)
- Start-to-start better matches cron semantics and user expectations

**Claim horizon size:**
- 10s balances "claiming early" vs "claiming too often"
- Larger horizon = more scheduling flexibility but less precise timing
- Smaller horizon = more precise timing but more DB queries and missed schedules
- 10s works well with 5s tick interval (2x margin)

## Validation

Created comprehensive test suite (`scheduler-timing.spec.ts`) covering:
- Fast execution (< interval): intervals maintained correctly ✓
- Slow execution (> interval): rescheduled from completion time ✓
- AI interval hints: respected in both fast and slow cases ✓
- Exponential backoff: applied correctly with timing safety ✓
- Variable execution times: maintains minimum intervals ✓
- Edge cases: stale lastRunAt, very short intervals ✓

All tests pass, confirming the fixes work as expected.

## References

- ADR-0023: Exponential Backoff for Failures
- ADR-0024: Fix Claim Horizon Bug (this ADR supersedes and extends 0024)
- GitHub issue: "Endpoint running every 5 seconds despite 60s interval"
