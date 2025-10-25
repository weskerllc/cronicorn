# Fix Claim Horizon Bug - Endpoints Running Too Frequently

**Date:** 2025-10-22
**Status:** Accepted

## Context

The scheduler was experiencing a critical bug where endpoints with baseline intervals ≤ 60 seconds would run on every scheduler tick (every 5 seconds), rather than respecting their configured intervals.

### Root Cause

The `claimDueEndpoints` function used a single `withinMs` parameter (default 60,000ms) for two distinct purposes:

1. **Look-ahead window**: Determine which endpoints are "due" to run
2. **Lock duration**: How long to lock claimed endpoints

The claiming logic was:
```typescript
const horizon = now + withinMs; // now + 60 seconds
// Claim endpoints where nextRunAt <= horizon
```

This meant endpoints with `nextRunAt` up to 60 seconds in the future would be claimed immediately.

### The Bug Scenario

```
User creates endpoint with 60-second interval:
  
Time 10:00:00 - Endpoint runs
  lastRunAt = 10:00:00
  nextRunAt = 10:01:00 (60 seconds later)
  
Time 10:00:05 - Scheduler tick (5 seconds later)
  now = 10:00:05
  horizon = 10:01:05 (now + 60s)
  nextRunAt (10:01:00) <= horizon (10:01:05)? YES!
  ❌ Endpoint claimed 55 seconds early!
  
Time 10:00:10 - Scheduler tick
  ❌ Endpoint claimed again (50 seconds early)
  
... repeats every 5 seconds until nextRunAt passes ...
```

### Impact

- Endpoints with intervals ≤ 60 seconds ran every 5 seconds
- Wasted compute resources
- Unexpected API load on downstream services
- Poor user experience (jobs running 10x+ more frequently than expected)
- Exponential backoff was ineffective for intervals < 60 seconds

## Decision

**Rename `LOCK_TTL_MS` → `CLAIM_HORIZON_MS` and reduce default from 60,000ms to 10,000ms.**

The claim horizon represents the look-ahead window for determining which endpoints are due to run. A 10-second window:
- Provides sufficient tolerance for clock skew (±5 seconds is typical in distributed systems)
- Prevents premature claiming of endpoints with short intervals
- Still allows efficient batching of truly due endpoints

### Configuration

```typescript
CLAIM_HORIZON_MS: z.coerce.number().int().positive().default(10000)
```

**Default value**: 10,000ms (10 seconds)

**Reasoning**:
- Most clock skew is < 5 seconds
- 10 seconds provides comfortable margin
- Small enough to not interfere with intervals as short as 15-30 seconds
- Large enough for scheduler processing variations

## Consequences

### Positive

✅ **Fixes the core bug**: Endpoints now run at their configured intervals, not on every tick

✅ **Better resource utilization**: No more wasteful repeated executions

✅ **Improved user experience**: Jobs run when expected

✅ **Exponential backoff works correctly**: Even for short intervals

✅ **Clearer naming**: `CLAIM_HORIZON_MS` better describes its purpose than `LOCK_TTL_MS`

### Negative / Considerations

⚠️ **Clock skew sensitivity**: Deployments with > 10-second clock skew may miss runs
- **Mitigation**: Increase `CLAIM_HORIZON_MS` for such environments
- **Best practice**: Use NTP to keep clocks synchronized

⚠️ **Configuration change**: Existing deployments using default will see behavior change
- **Impact**: This is a bug fix, so changed behavior is actually correct
- **Migration**: If you explicitly relied on 60s look-ahead (unlikely), set `CLAIM_HORIZON_MS=60000`

⚠️ **Smaller batches**: Fewer endpoints claimed per tick (only those actually due)
- **Impact**: Minimal - scheduler ticks every 5 seconds, so throughput unchanged
- **Benefit**: More precise execution timing

### Edge Cases Handled

1. **Scheduler paused/restarted**: Overdue endpoints are immediately claimed (nextRunAt in past)
2. **Very short intervals** (< 10s): Now work correctly (were broken before)
3. **Long intervals** (hours/days): Unchanged behavior
4. **Distributed schedulers**: 10s horizon provides adequate clock skew tolerance

## Technical Changes

### Code Changes

1. **Config** (`apps/scheduler/src/index.ts`):
   - Renamed `LOCK_TTL_MS` → `CLAIM_HORIZON_MS`
   - Changed default: `60000` → `10000`

2. **Documentation** (`apps/scheduler/README.md`):
   - Updated config table with new name and purpose

3. **Tests** (`packages/domain/src/testing/contracts.ts`):
   - Added regression test: "should not claim endpoints outside horizon window"
   - Verifies 10s horizon doesn't claim endpoint 60s in future
   - Verifies old 60s horizon behavior (for comparison)

### Interface Stability

The `claimDueEndpoints(limit: number, withinMs: number)` signature is **unchanged**. Only the config name and default value changed, maintaining backward compatibility at the code level.

## Alternatives Considered

### Option 1: Separate lock duration from claim horizon
Add two parameters: `claimHorizonMs` and `lockDurationMs`

**Rejected**: Overcomplicates the API. The lock is cleared immediately after execution anyway, so lock duration is not meaningful for our use case.

### Option 2: Set horizon to 0 (only claim exactly due endpoints)
**Rejected**: Too strict, doesn't account for clock skew or scheduler processing variation. 10s provides practical tolerance.

### Option 3: Dynamic horizon based on endpoint interval
Calculate horizon as `min(interval * 0.1, 60000)`

**Rejected**: Adds complexity without clear benefit. Fixed 10s horizon is simpler and works for all reasonable intervals.

## Validation

### Test Coverage

- ✅ Unit test: Endpoint 60s in future not claimed with 10s horizon
- ✅ Unit test: Same endpoint claimed with 60s horizon (old behavior)
- ✅ Existing tests: All contract tests pass

### User Validation

The user who reported the bug verified that after this fix:
- Endpoint with 60-second interval now runs every 60 seconds (not every 5)
- Exponential backoff works correctly on failures
- Normal scheduling resumes after fixing the endpoint

## Migration Notes

### For New Deployments
No action required - new default (10s) is optimal.

### For Existing Deployments

**If using default config** (recommended):
- Behavior will improve automatically
- This is a bug fix - no migration needed

**If explicitly set `LOCK_TTL_MS=60000`**:
- Rename to `CLAIM_HORIZON_MS=60000` (preserves old behavior)
- Or remove to use new 10s default (recommended)

**If you have clock skew > 10 seconds**:
- Increase `CLAIM_HORIZON_MS` accordingly
- Fix your NTP configuration (best practice)

## References

- Related to exponential backoff (ADR-0023)
- Architecture pattern: Domain layer controls scheduling policy
- Contract tests: `packages/domain/src/testing/contracts.ts`
- Configuration: `apps/scheduler/src/index.ts`
