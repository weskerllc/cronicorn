# Exponential Backoff for Failing Endpoints

**Date:** 2025-10-22
**Status:** Accepted

## Context

The scheduler was experiencing tight retry loops when endpoints failed. With a 5-second poll interval and no backoff mechanism, failing endpoints would be retried every 5 seconds indefinitely. This caused:

1. Unnecessary load on downstream services
2. Wasted compute resources
3. Difficulty debugging (log spam)
4. Poor user experience (no automatic recovery mechanism)

Example scenario: An endpoint with a typo in its URL (`ttps://` instead of `https://`) would fail instantly and be retried every 5 seconds, accumulating a high `failureCount` but never backing off.

## Decision

Implemented exponential backoff for interval-based endpoint schedules in the domain layer's `planNextRun` function.

**Formula**: `effectiveInterval = baseInterval * 2^min(failureCount, 5)`

**Key characteristics**:
- Backoff caps at 5 failures (32x multiplier) to prevent excessive delays
- Only applies to `baseline-interval` schedules, not `baseline-cron`
- AI hints can override backoff (by design - AI can provide recovery strategies)
- Respects existing min/max interval clamps
- Pure function in domain layer - no IO, fully unit-testable

**Progression example** (60-second base interval):
- 0 failures: 60s (1 minute)
- 1 failure: 120s (2 minutes)
- 2 failures: 240s (4 minutes)
- 3 failures: 480s (8 minutes)
- 4 failures: 960s (16 minutes)
- 5+ failures: 1920s (32 minutes) - capped

## Consequences

**Positive**:
- Prevents tight retry loops on failing endpoints
- Reduces load on failing downstream services
- Natural pressure relief without requiring manual intervention
- Pure domain logic - easily testable and predictable
- Users get automatic "breathing room" for transient issues to resolve

**Negative**:
- Endpoints with transient issues may take longer to recover (acceptable tradeoff)
- No per-endpoint backoff customization (can add later if needed)
- Cron schedules don't benefit from backoff (intentional - they should run on schedule)

**Code affected**:
- `packages/domain/src/governor/plan-next-run.ts` - Added `calculateBackoffInterval` helper
- `packages/domain/tests/governor.spec.ts` - Added 10 new test cases covering backoff scenarios

**Alternatives considered**:
1. **Circuit breaker pattern**: Auto-pause after N consecutive failures
   - Rejected: Too aggressive, requires manual intervention to resume
2. **Configurable backoff per endpoint**: Add fields to `JobEndpoint`
   - Rejected: YAGNI - can add later if users need custom strategies
3. **Adapter-level retry logic**: Implement in scheduler/dispatcher
   - Rejected: Backoff is a scheduling policy, belongs in domain

## References

Related to user-reported issue: Endpoint with malformed URL retrying every 5 seconds indefinitely.

Aligns with architecture principles:
- Pure domain logic for scheduling policies
- YAGNI - hardcoded sensible defaults, can make configurable later
- Testability - all backoff logic covered by unit tests
