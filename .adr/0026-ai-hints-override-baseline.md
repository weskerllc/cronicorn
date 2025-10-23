# AI Hints Override Baseline Intervals

**Date:** 2025-01-22
**Status:** Accepted

## Context

After fixing the scheduler timing issues (ADR-0025) by changing `planNextRun` to calculate intervals from `now` instead of `lastRunAt`, we discovered that AI interval hints were being ignored when they were longer than the baseline interval. 

The scheduler uses a "choose earliest" candidate selection logic that was treating AI hints and baseline intervals as equals. This meant that:
- A baseline interval of 15s would always beat an AI hint of 30s
- The AI planner's intent to relax/tighten schedules was being overridden
- Tests expecting AI hints to control cadence were failing

The architecture documentation (Section 2.2) clearly states: "AI interval hints enable adaptive cadence" and "This makes AI intervals truly win after a run (critical for adaptive cadence)." The intent is for AI hints to **override** baseline, not compete with it.

## Decision

We changed the candidate selection logic in `planNextRun` to give AI hints precedence:

```typescript
// AI interval hints override baseline to enable adaptive cadence (tighten/relax schedule).
// AI one-shot hints compete with all candidates (earliest wins) for specific timing needs.
// When both AI hints exist, one-shot competes with interval.
let chosen: Candidate;
if (aiInterval && aiOneShot) {
  // Both AI hints present: choose earliest, ignore baseline
  chosen = aiOneShot.at.getTime() < aiInterval.at.getTime() ? aiOneShot : aiInterval;
}
else if (aiInterval) {
  // AI interval overrides baseline
  chosen = aiInterval;
}
else if (aiOneShot) {
  // AI one-shot competes with baseline (earliest wins)
  chosen = aiOneShot.at.getTime() < baseline.at.getTime() ? aiOneShot : baseline;
}
else {
  chosen = baseline;
}
```

**Semantics:**
1. **AI interval hints override baseline** - When present and not expired, they control the schedule regardless of duration relative to baseline
2. **AI one-shot hints compete** - These represent specific timing needs and compete with other candidates using "earliest wins"
3. **Both AI hints** - When both exist, they compete with each other, and the winner overrides baseline

## Consequences

### Positive
- **Adaptive cadence works correctly** - AI planner can now tighten (shorter intervals) OR relax (longer intervals) schedules
- **Intent is clear** - The code now matches the architecture's stated goal: "AI hints truly win after a run"
- **Flash sale scenario preserved** - Multi-tier coordination scenarios continue to work as designed
- **Tests validate behavior** - Comprehensive test coverage ensures AI hints work for both fast and slow executions

### Changes Required
- Updated `packages/domain/src/governor/plan-next-run.ts` candidate selection logic
- Changed mock in `scheduler-timing.spec.ts` from `mockResolvedValue` to `mockImplementation` to ensure fresh endpoint state

### Trade-offs
- **AI interval always wins** - Even if an AI hint suggests a very long interval, it will override a shorter baseline. This is intentional but means AI logic must be robust.
- **One-shot still competes** - AI one-shot hints compete with baseline for backward compatibility and to support specific timing overrides.

### Future Considerations
- If we need baseline to act as a "maximum interval" guard, we should use `maxIntervalMs` clamps rather than changing this precedence logic
- AI planner implementations should validate proposed intervals against reasonable bounds before writing hints
- Consider adding metrics to track how often AI hints differ significantly from baseline

## References

- Related to TASK-1.2.3 (Scheduler timing fixes)
- Builds on ADR-0025 (Fix scheduler timing issues)
- Validates flash sale scenario (467 runs, 18 assertions)
- Architecture doc Section 2.2: "AI Hints (how AI steers schedule)"
