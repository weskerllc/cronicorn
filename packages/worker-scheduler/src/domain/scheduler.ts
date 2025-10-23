// packages/scheduler/src/scheduler.ts
import { planNextRun } from "@cronicorn/domain";

import type { SchedulerDeps } from "./deps.js";

export type IScheduler = {
  tick: (batchSize: number, lockTtlMs: number) => Promise<void>;
};

export class Scheduler implements IScheduler {
  constructor(private readonly d: SchedulerDeps) { }

  async tick(batchSize: number, lockTtlMs: number) {
    const now = this.d.clock.now();
    console.log(`[Scheduler] Tick at ${now.toISOString()}, claiming with horizon: ${lockTtlMs}ms`);

    const ids = await this.d.jobs.claimDueEndpoints(batchSize, lockTtlMs);
    console.log(`[Scheduler] Claimed ${ids.length} endpoint(s):`, ids);

    for (const id of ids) await this.handleEndpoint(id);
  }

  private async handleEndpoint(endpointId: string) {
    const { clock, jobs, runs, dispatcher, cron } = this.d;
    const now = clock.now();

    const ep = await jobs.getEndpoint(endpointId);
    if (!ep)
      return;

    console.log(`[Scheduler] Handling endpoint ${endpointId}:`, {
      name: ep.name,
      nextRunAt: ep.nextRunAt,
      lastRunAt: ep.lastRunAt,
      baselineIntervalMs: ep.baselineIntervalMs,
      failureCount: ep.failureCount,
      now: now.toISOString(),
    });

    const runId = await runs.create({
      endpointId,
      status: "running",
      attempt: ep.failureCount + 1,
      source: "scheduler",
    });

    const result = await dispatcher.execute(ep);
    await runs.finish(runId, {
      status: result.status,
      durationMs: result.durationMs,
      statusCode: result.statusCode,
      responseBody: result.responseBody,
      err: result.errorMessage,
    });

    // re-read to include any AI hint the planner may have written while running
    const fresh = await jobs.getEndpoint(endpointId);
    const plan = planNextRun(now, fresh, cron);

    // Safety: If execution took longer than the interval, nextRunAt may be in the past.
    // Reschedule from completion time using the originally intended interval.
    const currentTime = clock.now();
    const currentTimeMs = currentTime.getTime();
    let safeNextRunAt = plan.nextRunAt;

    if (plan.nextRunAt.getTime() < currentTimeMs) {
      // Use the interval that planNextRun calculated, regardless of source (baseline, AI, clamped)
      // This preserves the scheduling policy while preventing immediate re-claiming
      const intendedIntervalMs = Math.max(plan.nextRunAt.getTime() - now.getTime(), 1000);
      safeNextRunAt = new Date(currentTimeMs + intendedIntervalMs);
      // eslint-disable-next-line no-console
      console.log(`[Scheduler] Adjusted nextRunAt (was in past): ${plan.nextRunAt.toISOString()} -> ${safeNextRunAt.toISOString()}`);
    } // eslint-disable-next-line no-console
    console.log(`[Scheduler] Scheduling decision for ${endpointId}:`, {
      resultStatus: result.status,
      oldFailureCount: fresh.failureCount,
      nextRunAt: safeNextRunAt.toISOString(),
      source: plan.source,
      intervalFromNow: safeNextRunAt.getTime() - currentTimeMs,
      failureCountPolicy: result.status === "success" ? "reset" : "increment",
    });

    await jobs.updateAfterRun(endpointId, {
      lastRunAt: now,
      nextRunAt: safeNextRunAt,
      status: { status: result.status, durationMs: result.durationMs },
      failureCountPolicy: result.status === "success" ? "reset" : "increment",
      clearExpiredHints: true,
    });
  }
}
