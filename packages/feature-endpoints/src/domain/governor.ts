// governor.ts
import type { JobEndpoint } from "./ports.js";

export function nextCronFire(cron: string, from: Date): Date {
    throw new Error("impl for tests: inject fn or use adapter");
}

type Source =
    | "paused"
    | "ai-oneshot"
    | "ai-interval"
    | "baseline-cron"
    | "baseline-interval"
    | "clamped-min"
    | "clamped-max";

export function planNextRun(now: Date, j: JobEndpoint): { nextRunAt: Date; source: Source } {
    const nowMs = now.getTime();
    const last = j.lastRunAt ?? now;
    const lastMs = last.getTime();

    // --- candidates ---
    const baseline = j.baselineCron
        ? { at: nextCronFire(j.baselineCron, now), src: "baseline-cron" as const }
        : { at: new Date(lastMs + (j.baselineIntervalMs ?? 60_000)), src: "baseline-interval" as const };

    const freshHint = !!(j.aiHintExpiresAt && j.aiHintExpiresAt.getTime() > nowMs);

    const aiInterval = freshHint && j.aiHintIntervalMs
        ? { at: new Date(lastMs + j.aiHintIntervalMs), src: "ai-interval" as const }
        : undefined;

    const aiOneShot = freshHint && j.aiHintNextRunAt
        ? { at: j.aiHintNextRunAt, src: "ai-oneshot" as const }
        : undefined;

    const candidates = [baseline, aiInterval, aiOneShot].filter(Boolean) as Array<{ at: Date; src: Source }>;
    let chosen = candidates.length
        ? candidates.sort((a, b) => a.at.getTime() - b.at.getTime())[0]
        : baseline;

    if (chosen.at.getTime() < nowMs)
        chosen = { at: new Date(nowMs), src: chosen.src };

    // --- clamp by min/max relative to *last run* ---
    const minAt = j.minIntervalMs ? new Date(lastMs + j.minIntervalMs) : undefined;
    const maxAt = j.maxIntervalMs ? new Date(lastMs + j.maxIntervalMs) : undefined;

    if (minAt && chosen.at < minAt)
        chosen = { at: minAt, src: "clamped-min" };
    if (maxAt && chosen.at > maxAt)
        chosen = { at: maxAt, src: "clamped-max" };

    // --- pause wins ---
    if (j.pausedUntil && j.pausedUntil > now)
        return { nextRunAt: j.pausedUntil, source: "paused" };

    return { nextRunAt: chosen.at, source: chosen.src };
}
