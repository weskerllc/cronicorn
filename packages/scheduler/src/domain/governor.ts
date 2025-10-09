import type { Cron, JobEndpoint } from "./ports.js";

type Source =
  | "paused"
  | "ai-oneshot"
  | "ai-interval"
  | "baseline-cron"
  | "baseline-interval"
  | "clamped-min"
  | "clamped-max";

export function planNextRun(now: Date, j: JobEndpoint, cron: Cron): { nextRunAt: Date; source: Source } {
  const nowMs = now.getTime();
  const last = j.lastRunAt ?? now;
  const lastMs = last.getTime();

  // --- candidates ---
  const baseline = j.baselineCron
    ? { at: cron.next(j.baselineCron, now), src: "baseline-cron" as const }
    : { at: new Date(lastMs + (j.baselineIntervalMs ?? 60_000)), src: "baseline-interval" as const };

  const freshHint = !!(j.aiHintExpiresAt && j.aiHintExpiresAt.getTime() > nowMs);

  const aiInterval = freshHint && j.aiHintIntervalMs
    ? { at: new Date(lastMs + j.aiHintIntervalMs), src: "ai-interval" as const }
    : undefined;

  const aiOneShot = freshHint && j.aiHintNextRunAt
    ? { at: j.aiHintNextRunAt, src: "ai-oneshot" as const }
    : undefined;

  const candidates: Array<{ at: Date; src: Source }> = [baseline];
  if (aiInterval)
    candidates.push(aiInterval);
  if (aiOneShot)
    candidates.push(aiOneShot);

  let chosen = candidates[0];
  if (candidates.length > 1) {
    chosen = [...candidates].sort((a, b) => a.at.getTime() - b.at.getTime())[0];
  }

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
