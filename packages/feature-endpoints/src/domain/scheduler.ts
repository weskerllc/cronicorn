import type { Clock, Cron, Dispatcher, JobsRepo, RunsRepo } from "./ports.js";

import { planNextRun } from "./governor.js";

export class Scheduler {
    constructor(
        private deps: { clock: Clock; jobs: JobsRepo; runs: RunsRepo; dispatcher: Dispatcher; cron: Cron },
    ) { }

    // poller entrypoint
    async tick(batch: number, lockTtlMs: number) {
        const ids = await this.deps.jobs.claimDueEndpoints(batch, lockTtlMs);
        for (const id of ids) await this.handleEndpoint(id);
    }

    async handleEndpoint(endpointId: string) {
        const now = this.deps.clock.now();
        const ep = await this.deps.jobs.getEndpoint(endpointId);

        const runId = await this.deps.runs.create({ endpointId, status: "running", attempt: ep.failureCount + 1 });
        const result = await this.deps.dispatcher.execute(ep);

        await this.deps.runs.finish(runId, { status: result.status, durationMs: result.durationMs });

        // re-read to include any AI hint the planner may have written while running
        const fresh = await this.deps.jobs.getEndpoint(endpointId);
        const plan = planNextRun(now, fresh, this.deps.cron);
        await this.deps.jobs.updateAfterRun(endpointId, {
            lastRunAt: now,
            nextRunAt: plan.nextRunAt,
            status: { status: result.status, durationMs: result.durationMs },
            failureCountPolicy: result.status === "success" ? "reset" : "increment",
            clearExpiredHints: true,
        });
    }
}
