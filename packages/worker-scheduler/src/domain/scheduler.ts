// packages/scheduler/src/scheduler.ts
import { getRunsLimit, planNextRun } from "@cronicorn/domain";

import type { SchedulerDeps } from "./deps.js";

export type IScheduler = {
  tick: (batchSize: number, lockTtlMs: number) => Promise<void>;
  cleanupZombieRuns: (olderThanMs: number) => Promise<number>;
};

export class Scheduler implements IScheduler {
  constructor(private readonly d: SchedulerDeps) { }

  async tick(batchSize: number, lockTtlMs: number) {
    const now = this.d.clock.now();
    this.d.logger.debug({ lockTtlMs, now: now.toISOString() }, "Scheduler tick started");

    const ids = await this.d.jobs.claimDueEndpoints(batchSize, lockTtlMs);
    this.d.logger.info({ claimedCount: ids.length, endpointIds: ids }, "Claimed endpoints");

    for (const id of ids) await this.handleEndpoint(id);
  }

  private async handleEndpoint(endpointId: string) {
    const { clock, jobs, runs, dispatcher, cron } = this.d;
    const now = clock.now();

    const ep = await jobs.getEndpoint(endpointId);
    if (!ep)
      return;

    const epLogger = this.d.logger.child({ endpointId, jobId: ep.jobId, tenantId: ep.tenantId });
    epLogger.info(
      {
        name: ep.name,
        nextRunAt: ep.nextRunAt,
        lastRunAt: ep.lastRunAt,
        baselineIntervalMs: ep.baselineIntervalMs,
        failureCount: ep.failureCount,
      },
      "Handling endpoint execution",
    );

    // Calculate the source before execution (what schedule triggered this run)
    const prePlan = planNextRun(now, ep, cron);

    const deferUntil = await this.checkRunLimit(ep.tenantId, endpointId, now);
    if (deferUntil) {
      await jobs.setNextRunAtIfEarlier(endpointId, deferUntil);
      return;
    }

    const runId = await runs.create({
      endpointId,
      status: "running",
      attempt: ep.failureCount + 1,
      source: prePlan.source,
    });

    const runLogger = epLogger.child({ runId, attempt: ep.failureCount + 1 });
    const result = await dispatcher.execute(ep);

    if (result.status === "success") {
      runLogger.info({ durationMs: result.durationMs, statusCode: result.statusCode }, "Execution succeeded");
    }
    else {
      runLogger.warn(
        {
          durationMs: result.durationMs,
          statusCode: result.statusCode,
          error: result.errorMessage,
        },
        "Execution failed",
      );
    }

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
      epLogger.warn(
        {
          originalNextRunAt: plan.nextRunAt.toISOString(),
          adjustedNextRunAt: safeNextRunAt.toISOString(),
          intendedIntervalMs,
        },
        "Adjusted nextRunAt (was in past)",
      );
    }

    epLogger.info(
      {
        resultStatus: result.status,
        oldFailureCount: fresh.failureCount,
        nextRunAt: safeNextRunAt.toISOString(),
        source: plan.source,
        intervalFromNow: safeNextRunAt.getTime() - currentTimeMs,
        failureCountPolicy: result.status === "success" ? "reset" : "increment",
      },
      "Scheduling decision made",
    );

    await jobs.updateAfterRun(endpointId, {
      lastRunAt: now,
      nextRunAt: safeNextRunAt,
      status: { status: result.status, durationMs: result.durationMs },
      failureCountPolicy: result.status === "success" ? "reset" : "increment",
      clearExpiredHints: true,
    });
  }

  async cleanupZombieRuns(olderThanMs: number) {
    const count = await this.d.runs.cleanupZombieRuns(olderThanMs);
    if (count > 0) {
      this.d.logger.info({ count, olderThanMs }, "Cleaned up zombie runs");
    }
    return count;
  }

  /**
   * Guard monthly execution limits before dispatch (Execution Metering).
   *
   * **Purpose**: Enforce soft monthly execution limits per subscription tier to prevent
   * unbilled runaway executions. This is the core of "execution metering."
   *
   * **Limits**:
   * - Free: 10,000 runs/month
   * - Pro: 100,000 runs/month
   * - Enterprise: 1,000,000 runs/month
   *
   * **Behavior** (Soft Limit + Deferral):
   * When a tenant's monthly run count reaches or exceeds their tier limit:
   * 1. Do NOT execute the endpoint
   * 2. Defer the run to the start of the next month (1st at 00:00 UTC)
   * 3. Log a warning with tenant/tier/counts for ops visibility
   *
   * If metrics lookup fails, proceed with execution (fail-open, prioritizes availability).
   *
   * **Usage by UI/API**:
   * - GET /subscriptions/usage returns totalRuns vs totalRunsLimit
   * - Scheduler silently defers; users see increased "next run" timestamp
   * - No explicit "quota exceeded" error returned to user (deferral is transparent)
   *
   * @param tenantId - User/tenant ID
   * @param endpointId - Endpoint ID (for logging)
   * @param now - Current time (injected Clock)
   * @returns Date to defer to (start of next month) if limit exceeded; null if OK to proceed
   */
  private async checkRunLimit(tenantId: string, endpointId: string, now: Date): Promise<Date | null> {
    try {
      const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const metrics = await this.d.runs.getFilteredMetrics({ userId: tenantId, sinceDate: startOfMonth });
      const userTier = await this.d.jobs.getUserTier(tenantId);
      const runsLimit = getRunsLimit(userTier);
      if (metrics.totalRuns >= runsLimit) {
        const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
        this.d.logger.warn({ tenantId, endpointId, userTier, totalRuns: metrics.totalRuns, runsLimit }, "Monthly run limit exceeded — skipping execution and deferring to next month");
        return startOfNextMonth;
      }
    }
    catch (err) {
      this.d.logger.error({ err }, "Failed to check monthly run limits — proceeding with execution");
    }
    return null;
  }
}
