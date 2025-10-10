/**
 * Pure scheduling policy: planNextRun
 *
 * Given current time, endpoint state, and cron helper, computes the next run time.
 * Respects pause, AI hints (interval/oneshot), baseline cadence, and min/max clamps.
 */

import type { JobEndpoint } from "../entities/index.js";
import type { Cron } from "../ports/index.js";
import type { PlanResult, PlanSource } from "./types.js";

type Candidate = { at: Date; src: PlanSource };

export function planNextRun(now: Date, j: JobEndpoint, cron: Cron): PlanResult {
    const nowMs = now.getTime();
    const last = j.lastRunAt ?? now;
    const lastMs = last.getTime();

    // --- Build candidates ---
    const baseline: Candidate = j.baselineCron
        ? { at: cron.next(j.baselineCron, now), src: "baseline-cron" }
        : { at: new Date(lastMs + (j.baselineIntervalMs ?? 60_000)), src: "baseline-interval" };

    const freshHint = !!(j.aiHintExpiresAt && j.aiHintExpiresAt.getTime() > nowMs);

    const aiInterval: Candidate | undefined
        = freshHint && j.aiHintIntervalMs
            ? { at: new Date(lastMs + j.aiHintIntervalMs), src: "ai-interval" }
            : undefined;

    const aiOneShot: Candidate | undefined
        = freshHint && j.aiHintNextRunAt
            ? { at: j.aiHintNextRunAt, src: "ai-oneshot" }
            : undefined;

    const candidates: Candidate[] = [baseline];
    if (aiInterval)
        candidates.push(aiInterval);
    if (aiOneShot)
        candidates.push(aiOneShot);

    // --- Choose earliest ---
    let chosen = candidates[0];
    if (candidates.length > 1) {
        chosen = [...candidates].sort((a, b) => a.at.getTime() - b.at.getTime())[0];
    }

    // Floor to now if candidate is in the past
    if (chosen.at.getTime() < nowMs)
        chosen = { at: new Date(nowMs), src: chosen.src };

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
