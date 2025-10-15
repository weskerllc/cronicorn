// packages/scheduler/src/scheduler.ts
import { planNextRun } from "@cronicorn/domain";

import type { SchedulerDeps } from "./deps.js";

export type IScheduler = {
  tick: (batchSize: number, lockTtlMs: number) => Promise<void>;
};

export class Scheduler implements IScheduler {
  constructor(private readonly d: SchedulerDeps) { }

  async tick(batchSize: number, lockTtlMs: number) {
    const ids = await this.d.jobs.claimDueEndpoints(batchSize, lockTtlMs);
    for (const id of ids) await this.handleEndpoint(id);
  }

  private async handleEndpoint(endpointId: string) {
    const { clock, jobs, runs, dispatcher, cron } = this.d;
    const now = clock.now();

    const ep = await jobs.getEndpoint(endpointId);
    if (!ep)
      return;

    const runId = await runs.create({
      endpointId,
      status: "running",
      attempt: ep.failureCount + 1,
    });

    const result = await dispatcher.execute(ep);
    await runs.finish(runId, { status: result.status, durationMs: result.durationMs });

    // re-read to include any AI hint the planner may have written while running
    const fresh = await jobs.getEndpoint(endpointId);
    const plan = planNextRun(now, fresh, cron);

    await jobs.updateAfterRun(endpointId, {
      lastRunAt: now,
      nextRunAt: plan.nextRunAt,
      status: { status: result.status, durationMs: result.durationMs },
      failureCountPolicy: result.status === "success" ? "reset" : "increment",
      clearExpiredHints: true,
    });
  }
}
