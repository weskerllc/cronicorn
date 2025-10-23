/**
 * Pure scheduling policy: planNextRun
 *
 * Given current time, endpoint state, and cron helper, computes the next run time.
 * Respects pause, AI hints (interval/oneshot), baseline cadence, and min/max clamps.
 * Applies exponential backoff to interval-based schedules on repeated failures.
 */

import type { JobEndpoint } from "../entities/index.js";
import type { Cron } from "../ports/index.js";
import type { PlanResult, PlanSource } from "./types.js";

type Candidate = { at: Date; src: PlanSource };

/**
 * Calculate effective interval with exponential backoff based on failure count.
 *
 * Applies 2^n backoff with a cap at 5 failures (32x multiplier) to prevent
 * excessive delays while still providing meaningful backpressure on repeated failures.
 *
 * @param baseIntervalMs - Base interval in milliseconds
 * @param failureCount - Number of consecutive failures
 * @returns Effective interval with backoff applied
 */
function calculateBackoffInterval(baseIntervalMs: number, failureCount: number): number {
  if (failureCount === 0)
    return baseIntervalMs;

  const cappedFailures = Math.min(failureCount, 5);
  const multiplier = 2 ** cappedFailures;
  return baseIntervalMs * multiplier;
}

export function planNextRun(now: Date, j: JobEndpoint, cron: Cron): PlanResult {
  const nowMs = now.getTime();
  // Always use 'now' as the base for interval calculations since this is the current execution time
  // and updateAfterRun will set lastRunAt = now. Using j.lastRunAt would create a mismatch.
  const lastMs = nowMs;

  // --- Build candidates ---
  const baseline: Candidate = j.baselineCron
    ? { at: cron.next(j.baselineCron, now), src: "baseline-cron" }
    : {
        at: new Date(lastMs + calculateBackoffInterval(j.baselineIntervalMs ?? 60_000, j.failureCount)),
        src: "baseline-interval",
      };

  const freshHint = !!(j.aiHintExpiresAt && j.aiHintExpiresAt.getTime() > nowMs);

  const aiInterval: Candidate | undefined
    = freshHint && j.aiHintIntervalMs
      ? { at: new Date(lastMs + j.aiHintIntervalMs), src: "ai-interval" }
      : undefined;

  const aiOneShot: Candidate | undefined
    = freshHint && j.aiHintNextRunAt
      ? { at: j.aiHintNextRunAt, src: "ai-oneshot" }
      : undefined;

  // --- Choose candidate ---
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

  // If candidate is in the past, reschedule from now to maintain interval
  // For interval-based schedules, use now + interval to prevent immediate re-claiming
  // For cron schedules, use cron.next() which already handles this
  if (chosen.at.getTime() < nowMs) {
    if (chosen.src === "baseline-interval" && !j.baselineCron) {
      // Reschedule from now with the intended interval
      const intervalMs = calculateBackoffInterval(j.baselineIntervalMs ?? 60_000, j.failureCount);
      chosen = { at: new Date(nowMs + intervalMs), src: chosen.src };
    }
    else if (chosen.src === "ai-interval") {
      // Reschedule AI interval from now
      chosen = { at: new Date(nowMs + (j.aiHintIntervalMs ?? 60_000)), src: chosen.src };
    }
    else {
      // For cron and one-shot hints, floor to now (run immediately)
      chosen = { at: new Date(nowMs), src: chosen.src };
    }
  }

  // --- Clamp relative to lastRunAt ---
  const minAt = j.minIntervalMs ? new Date(lastMs + j.minIntervalMs) : undefined;
  const maxAt = j.maxIntervalMs ? new Date(lastMs + j.maxIntervalMs) : undefined;

  if (minAt && chosen.at < minAt)
    chosen = { at: minAt, src: "clamped-min" };
  if (maxAt && chosen.at > maxAt)
    chosen = { at: maxAt, src: "clamped-max" };

  // --- Pause wins ---
  if (j.pausedUntil && j.pausedUntil > now)
    return { nextRunAt: j.pausedUntil, source: "paused" };

  return { nextRunAt: chosen.at, source: chosen.src };
}
