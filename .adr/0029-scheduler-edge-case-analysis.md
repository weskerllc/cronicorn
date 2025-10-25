# Comprehensive Scheduler Edge Case Analysis

**Date:** 2025-10-23
**Status:** Accepted

## Context

After discovering and fixing the third bug in scheduler logic (premature multiple executions due to lock clearing), conducted a systematic analysis of ALL potential edge cases in the scheduling system to prevent future issues.

This analysis examines interactions between:
- Claim horizon mechanism (10s look-ahead)
- Lock management (_lockedUntil)
- Governor policies (AI hints, pause, min/max clamps, backoff)
- Distributed workers (PostgreSQL FOR UPDATE SKIP LOCKED)
- Time calculations (cron, intervals, wall clock)

## Analysis Results

### ✅ Verified Safe Behaviors

1. **Long Execution Exceeding Interval**
   - Safety check in scheduler reschedules from completion time
   - Uses original intended interval to maintain cadence
   - Example: 60s interval with 90s execution → next run at T+150s (not T+60s)

2. **Pause Expiring During Execution**
   - Claim query prevents claiming paused endpoints
   - If execution somehow starts during pause, next schedule respects pause expiry
   - Correct handling of pause state transitions

3. **AI Hint Expiring During Execution**
   - Re-reads endpoint after execution (gets fresh hints if written by planner)
   - Timestamp-based expiry checks prevent using stale hints
   - clearExpiredHints only clears hints that were expired at read time

4. **Multiple Workers (Distributed Coordination)**
   - PostgreSQL `FOR UPDATE SKIP LOCKED` prevents double-claiming atomically
   - Each repo operation auto-commits (lock persists across execution)
   - No transaction isolation issues

5. **Exponential Backoff Calculations**
   - Capped at 5 failures (32x multiplier)
   - No integer overflow risk (JavaScript safe integers support dates until year 287,586)
   - Min/max clamps applied AFTER backoff calculation

6. **Cron Next Time in Past**
   - Safety check floors to "now" when calculated time is in past
   - System self-heals after long executions
   - Example: 5-minute cron with 10-minute execution → runs immediately, then resumes schedule

7. **Concurrent AI Hint Writes**
   - No lost updates - updateAfterRun only modifies specific fields (nextRunAt, lastRunAt, failureCount, _lockedUntil)
   - AI hint fields preserved unless clearExpiredHints=true AND hints expired

### ⚠️ Issues Identified

#### CRITICAL: Lock Expiry for Long-Running Endpoints

**Problem**: Lock duration is hardcoded to max(horizon, 60s). If execution exceeds 60s, lock expires before completion, allowing duplicate execution by another worker.

**Example Timeline**:
```
T=0:   Worker A claims endpoint, sets _lockedUntil = T+60s
T=0:   Worker A starts execution
T=61s: Lock expires
T=61s: Worker B claims same endpoint (lock expired)
T=61s: Worker B starts execution
T=70s: Worker A completes (unaware of duplicate)
T=75s: Worker B completes
Result: Endpoint executed twice
```

**Impact**: Duplicate executions for any endpoint with execution time >60s

**Proposed Solutions**:

1. **Heartbeat Mechanism** (Best for distributed systems)
   - Worker extends lock every 30s during execution
   - Requires background thread/interval
   - Handles worker crashes gracefully (lock expires after missed heartbeat)

2. **Configurable Lock Duration** (Simplest)
   - Add `maxExecutionTimeMs` field to endpoint
   - Set lock to max(horizon, maxExecutionTimeMs)
   - User responsibility to configure correctly

3. **Run ID Tracking** (Most robust)
   - Check if run exists before executing
   - Requires additional query overhead
   - Prevents duplicate even if lock mechanism fails

**Recommendation**: Implement solution #2 (configurable) short-term, solution #1 (heartbeat) long-term.

#### CRITICAL: Zombie Runs from Worker Crashes

**Problem**: If worker crashes after `runs.create()` but before `runs.finish()`, run record stays in "running" state forever.

**Impact**:
- Database clutter
- Inaccurate metrics/observability  
- No visibility into which jobs failed due to crashes vs timeout

**Example**:
```
T=0:  Worker creates run record (status="running")
T=5:  Worker crashes (OOM, SIGKILL, network partition)
T=∞:  Run record never updated
```

**Proposed Solution**:

Add background cleanup job (separate worker or periodic task in scheduler):
```typescript
// Run every 5 minutes
async function cleanupZombieRuns() {
  const threshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
  
  const zombies = await db.runs.findMany({
    where: {
      status: "running",
      startedAt: { lt: threshold }
    }
  });
  
  for (const run of zombies) {
    await db.runs.update({
      id: run.id,
      status: "failed",
      finishedAt: new Date(),
      errorMessage: "Worker crashed or timed out (no response after 10 minutes)"
    });
  }
}
```

**Recommendation**: Implement as part of scheduler worker (runs alongside tick loop).

#### MEDIUM: Min/Max Interval Validation

**Problem**: API allowed `minIntervalMs > maxIntervalMs`, causing paradoxical behavior.

**Example**:
```
minIntervalMs = 60000 (1 minute)
maxIntervalMs = 30000 (30 seconds)
baselineIntervalMs = 45000 (45 seconds)

Governor logic:
1. Calculate baseline: T+45s
2. Apply min clamp: T+60s (45s < 60s)
3. Apply max clamp: T+30s (60s > 30s)
4. Result: T+30s (violates minIntervalMs!)
```

**Fix**: Added API validation (already implemented in this ADR):
```typescript
EndpointFieldsBaseSchema.refine(
  data => !data.minIntervalMs || !data.maxIntervalMs || 
          data.minIntervalMs <= data.maxIntervalMs,
  { message: "minIntervalMs must be less than or equal to maxIntervalMs" }
)
```

**Status**: ✅ FIXED

#### LOW: AI Hint Ambiguity

**Problem**: API allows setting both `aiHintIntervalMs` and `aiHintNextRunAt` simultaneously.

**Current Behavior**: Governor picks earliest of the two (pragmatic but undocumented).

**Semantics**:
- `aiHintIntervalMs`: "Run every X seconds" (recurring)
- `aiHintNextRunAt`: "Run at this specific time" (one-shot)
- Both set: Unclear intent

**Decision**: 
- Keep current behavior (earliest wins)
- Document in API contracts
- AI tools should typically set ONE or the OTHER, not both
- Consider logging warning when both are set

**Status**: Documented in tech debt log

### 📝 Known Limitations

#### Clock Skew / Time Travel

**Description**: System uses wall clock time (`Date.now()`), not monotonic time.

**Scenarios**:
- NTP corrections (±seconds)
- Daylight saving changes (±1 hour)
- Manual clock adjustments
- Virtualization time drift

**Impact**:
- Jobs may run early/late by clock adjustment amount
- Locks may expire early/late
- Intervals measured against shifted time

**Mitigation**:
- Acceptable for production systems with NTP
- Alternative: Use `process.hrtime()` for intervals, wall clock for absolute times (cron)
- Requires significant refactoring

**Decision**: Document as known limitation, don't fix unless customer impact.

#### Batch Starvation Under High Load

**Description**: With many endpoints due simultaneously, batch processing could theoretically starve later endpoints.

**Scenario**:
```
1000 endpoints all scheduled at T=0 (same cron)
batchSize = 10
pollInterval = 5s

Tick 1 (T=0):  Claim endpoints 1-10, execute
Tick 2 (T=5):  Claim endpoints 11-20, execute
...
Tick 100 (T=495): Claim endpoints 991-1000, execute

If endpoints 1-10 have 60s interval:
Tick 13 (T=60): Endpoints 1-10 due again (already processed all 1000)
```

However, with `ORDER BY nextRunAt`, endpoints are processed oldest-due first, so starvation requires:
- Execution time variance (some endpoints faster than others)
- Very high load (more due endpoints than can be processed in one interval)

**Mitigation**:
- Increase `batchSize` for high-load scenarios
- Add jitter to schedules (randomize within ±5s)
- Monitor queue depth metrics

**Decision**: Monitor in production, optimize if observed (scalability concern, not correctness bug).

## Decision

### Immediate Actions (Completed)

1. ✅ Added min/max interval validation to API contracts
2. ✅ Documented edge cases in tech debt log
3. ✅ Created this ADR for future reference

### Required Follow-ups (High Priority)

1. **Implement configurable lock duration**
   - Add `maxExecutionTimeMs` field to endpoint schema
   - Default to 60s, allow override up to 30 minutes
   - Update `claimDueEndpoints` to use this value

2. **Implement zombie run cleanup**
   - Add periodic task to scheduler worker
   - Mark runs older than 10 minutes as failed
   - Include descriptive error message

3. **Add observability metrics**
   - Track lock expiry events
   - Track zombie run cleanup events
   - Alert on duplicate executions

### Optional Enhancements (Lower Priority)

1. **Heartbeat mechanism** for very long-running jobs
2. **Run ID deduplication** as additional safety layer
3. **Clock skew detection** and alerting
4. **Batch processing optimization** for high-load scenarios

## Consequences

### Positive

- Comprehensive understanding of scheduling edge cases
- Proactive identification of potential issues before customer impact
- Clear prioritization of fixes (critical vs nice-to-have)
- Validation prevents configuration errors at API boundary

### Technical Debt Reduced

- Min/max validation prevents governor paradox
- Edge case analysis provides confidence in core logic
- Documentation aids future maintenance and debugging

### Ongoing Risks

- Long-running endpoints (>60s) may experience duplicates until lock duration is configurable
- Worker crashes create zombie runs until cleanup is implemented
- Clock skew is a fundamental limitation of time-based systems

## References

- ADR-0028: Scheduler Execution and Response Capture Fixes
- Tech Debt Log: Scheduling Edge Cases section
- Architecture Guide: Governor and Scheduler design
- PostgreSQL Locking: FOR UPDATE SKIP LOCKED semantics
