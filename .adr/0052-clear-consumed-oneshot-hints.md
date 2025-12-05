# Clear Consumed One-Shot Hints After Execution

**Date:** 2025-12-05
**Status:** Accepted

## Context

A production bug was discovered where clicking "Run Now" on an endpoint caused it to enter an infinite execution loop, running every ~5 seconds instead of once.

The "Run Now" feature works by creating an AI one-shot hint (`aiHintNextRunAt`) scheduled 1 second in the future, with a 60-minute TTL (`aiHintExpiresAt`). The scheduler should execute the endpoint once at that time and then return to normal baseline scheduling.

**What was happening:**

1. User clicks "Run Now" → one-shot hint created for `now + 1 second` with 60-min TTL
2. Scheduler executes the endpoint
3. `updateAfterRun` is called with `clearExpiredHints: true`
4. The hint is NOT cleared because TTL hasn't expired (only checks `aiHintExpiresAt <= now`)
5. On next scheduler tick, `planNextRun` sees the stale hint
6. Since `aiHintNextRunAt` is in the past, governor floors it to "now" (run immediately)
7. Endpoint executes again → repeat infinitely

The architecture docs state: "AI hints: have TTL; ignored after expiry; **cleared post-run**" — but the implementation only cleared hints when TTL expired, not when consumed.

## Decision

Modify `updateAfterRun` in the jobs-repo adapter to clear one-shot hints (`aiHintNextRunAt`) when they are in the past (consumed), regardless of whether the TTL has expired.

**New logic:**

```typescript
// Clear ALL hints if TTL expired
const clearAllHints = patch.clearExpiredHints && ep.aiHintExpiresAt && ep.aiHintExpiresAt <= now;

// Clear one-shot hint if consumed (time passed), even if TTL valid
const clearOneShotHint = !clearAllHints && ep.aiHintNextRunAt && ep.aiHintNextRunAt <= now;

if (clearAllHints) {
  // Clear all hint fields
} else if (clearOneShotHint) {
  // Only clear aiHintNextRunAt, preserve interval hint if present
}
```

**Key behaviors:**

- One-shot hints are consumed (cleared) after their scheduled time passes
- Interval hints (`aiHintIntervalMs`) are preserved until TTL expires
- When both hints exist and one-shot is consumed, interval hint remains active
- Future one-shot hints are not cleared prematurely

## Consequences

**Files changed:**

- `packages/adapter-drizzle/src/jobs-repo.ts` - Modified `updateAfterRun` logic
- `packages/domain/src/testing/contracts.ts` - Added 3 contract tests for new behavior
- `docs/public/technical/how-scheduling-works.md` - Updated documentation

**Behavior changes:**

- One-shot hints now behave as true "one-shot" operations — they execute once and are cleared
- The UI will correctly show hints as cleared after their scheduled time passes
- No more infinite execution loops from stale one-shot hints

**Testing:**

Added contract tests to verify:
1. Consumed one-shot hints are cleared even if TTL not expired
2. Interval hints are preserved when one-shot is cleared
3. Future one-shot hints are not cleared prematurely

## References

- Architecture doc section 11: "AI hints: have TTL; ignored after expiry; cleared post-run"
- `how-scheduling-works.md` Step 5: Database Update
