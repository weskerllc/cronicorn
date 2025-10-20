import type { Clock, JobsRepo, RunsRepo } from "@cronicorn/domain";

import type {
    DashboardStats,
    EndpointStats,
    JobStats,
    RecentActivityStats,
    RecentRun,
    RunTimeSeriesPoint,
    SuccessRateStats,
    TopEndpoint,
} from "./types.js";

/**
 * DashboardManager aggregates data from multiple repos to provide
 * high-level statistics and metrics for the user dashboard.
 *
 * **Architecture**:
 * - Depends ONLY on domain ports (JobsRepo, RunsRepo, Clock)
 * - Zero knowledge of adapters or HTTP layer
 * - Transaction management happens in composition root (API)
 * - Receives repos already bound to transaction context
 *
 * **Responsibilities**:
 * - Aggregate data from multiple repos efficiently
 * - Calculate derived metrics (success rates, trends)
 * - Format data for dashboard consumption
 * - Authorization (userId-scoped queries)
 *
 * **Performance**:
 * - Uses specialized repo queries that aggregate at DB level
 * - Minimizes N+1 queries by fetching bulk data
 * - Caches results at API layer (15-30 second staleTime)
 *
 * **Usage** (in composition root):
 * ```typescript
 * await db.transaction(async (tx) => {
 *   const jobsRepo = new DrizzleJobsRepo(tx);
 *   const runsRepo = new DrizzleRunsRepo(tx);
 *   const clock = new SystemClock();
 *   const manager = new DashboardManager(jobsRepo, runsRepo, clock);
 *
 *   const stats = await manager.getDashboardStats(userId, { days: 7 });
 * });
 * ```
 */
export class DashboardManager {
    constructor(
        private readonly jobsRepo: JobsRepo,
        private readonly runsRepo: RunsRepo,
        private readonly clock: Clock,
    ) { }

    /**
     * Get comprehensive dashboard statistics for a user.
     *
     * @param userId - The user ID
     * @param options - Query options
     * @param options.days - Number of days for time-series data (default: 7, max: 30)
     * @returns Aggregated dashboard statistics
     */
    async getDashboardStats(
        userId: string,
        options: { days?: number } = {},
    ): Promise<DashboardStats> {
        const days = Math.min(options.days ?? 7, 30);
        const now = this.clock.now();

        // Execute queries in parallel for performance
        const [
            jobs,
            endpoints,
            successRate,
            recentActivity,
            runTimeSeries,
            topEndpoints,
            recentRuns,
        ] = await Promise.all([
            this.getJobsStats(userId),
            this.getEndpointsStats(userId),
            this.calculateOverallSuccessRate(userId, days),
            this.getRecentActivity(userId, now),
            this.getRunTimeSeries(userId, days, now),
            this.getTopEndpoints(userId, 5),
            this.getRecentRunsGlobal(userId, 50),
        ]);

        return {
            jobs,
            endpoints,
            successRate,
            recentActivity,
            runTimeSeries,
            topEndpoints,
            recentRuns,
        };
    }

    /**
     * Get job statistics for a user.
     *
     * @param userId - The user ID
     * @returns Job count
     */
    private async getJobsStats(userId: string): Promise<JobStats> {
        const jobs = await this.jobsRepo.listJobs(userId, { status: "active" });

        return {
            total: jobs.length,
        };
    }

    /**
     * Get endpoint statistics for a user.
     *
     * @param userId - The user ID
     * @returns Endpoint counts (total, active, paused)
     */
    private async getEndpointsStats(userId: string): Promise<EndpointStats> {
        const jobs = await this.jobsRepo.listJobs(userId, { status: "active" });
        const now = this.clock.now();

        // Fetch all endpoints across all jobs
        const allEndpoints = await Promise.all(
            jobs.map(job => this.jobsRepo.listEndpointsByJob(job.id)),
        );

        const endpoints = allEndpoints.flat();
        const paused = endpoints.filter(
            ep => ep.pausedUntil && new Date(ep.pausedUntil) > now,
        ).length;

        return {
            total: endpoints.length,
            active: endpoints.length - paused,
            paused,
        };
    }

    /**
     * Calculate overall success rate across all endpoints.
     *
     * @param userId - The user ID
     * @param days - Number of days to analyze
     * @returns Success rate percentage and trend
     */
    private async calculateOverallSuccessRate(
        userId: string,
        days: number,
    ): Promise<SuccessRateStats> {
        // Get all active endpoints
        const jobs = await this.jobsRepo.listJobs(userId, { status: "active" });
        const allEndpoints = await Promise.all(
            jobs.map(job => this.jobsRepo.listEndpointsByJob(job.id)),
        );
        const endpoints = allEndpoints.flat();

        if (endpoints.length === 0) {
            return {
                overall: 0,
                trend: "stable",
            };
        }

        const now = this.clock.now();
        const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const previousPeriodStart = new Date(
            periodStart.getTime() - days * 24 * 60 * 60 * 1000,
        );

        // Fetch health summaries for all endpoints in parallel
        const currentHealthPromises = endpoints.map(ep =>
            this.runsRepo.getHealthSummary(ep.id, periodStart),
        );
        const previousHealthPromises = endpoints.map(ep =>
            this.runsRepo.getHealthSummary(ep.id, previousPeriodStart),
        );

        const [currentHealths, previousHealths] = await Promise.all([
            Promise.all(currentHealthPromises),
            Promise.all(previousHealthPromises),
        ]);

        // Calculate current period success rate
        const currentTotal = currentHealths.reduce(
            (sum, h) => sum + h.successCount + h.failureCount,
            0,
        );
        const currentSuccess = currentHealths.reduce((sum, h) => sum + h.successCount, 0);
        const currentRate = currentTotal > 0 ? (currentSuccess / currentTotal) * 100 : 0;

        // Calculate previous period success rate
        const previousTotal = previousHealths.reduce(
            (sum, h) => sum + h.successCount + h.failureCount,
            0,
        );
        const previousSuccess = previousHealths.reduce(
            (sum, h) => sum + h.successCount,
            0,
        );
        const previousRate = previousTotal > 0 ? (previousSuccess / previousTotal) * 100 : 0;

        // Determine trend (consider ±2% as stable)
        let trend: "up" | "down" | "stable" = "stable";
        const diff = currentRate - previousRate;
        if (diff > 2) {
            trend = "up";
        }
        else if (diff < -2) {
            trend = "down";
        }

        return {
            overall: Math.round(currentRate * 10) / 10, // Round to 1 decimal place
            trend,
        };
    }

    /**
     * Get recent activity metrics (last 24 hours).
     *
     * @param userId - The user ID
     * @param now - Current timestamp
     * @returns Run counts for last 24 hours
     */
    private async getRecentActivity(
        userId: string,
        now: Date,
    ): Promise<RecentActivityStats> {
        const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Fetch runs from last 24 hours
        const { runs } = await this.runsRepo.listRuns({
            userId,
            limit: 10000, // High limit to get all runs
        });

        // Filter to last 24h and count by status
        const recent24h = runs.filter(run => new Date(run.startedAt) >= since24h);
        const success24h = recent24h.filter(run => run.status === "success").length;
        const failure24h = recent24h.filter(
            run => run.status === "failed" || run.status === "timeout",
        ).length;

        return {
            runs24h: recent24h.length,
            success24h,
            failure24h,
        };
    }

    /**
     * Get time-series data for run activity.
     *
     * @param userId - The user ID
     * @param days - Number of days to include
     * @param now - Current timestamp
     * @returns Array of daily run counts
     */
    private async getRunTimeSeries(
        userId: string,
        days: number,
        now: Date,
    ): Promise<RunTimeSeriesPoint[]> {
        const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        // Fetch all runs in the time period
        const { runs } = await this.runsRepo.listRuns({
            userId,
            limit: 50000, // High limit to get all runs in period
        });

        // Filter to time period
        const recentRuns = runs.filter(run => new Date(run.startedAt) >= since);

        // Group by date and status
        const dateMap = new Map<
            string,
            { success: number; failure: number }
        >();

        // Initialize all days with zero counts
        for (let i = 0; i < days; i++) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split("T")[0];
            dateMap.set(dateStr, { success: 0, failure: 0 });
        }

        // Count runs by date and status
        for (const run of recentRuns) {
            const dateStr = new Date(run.startedAt).toISOString().split("T")[0];
            const counts = dateMap.get(dateStr);
            if (counts) {
                if (run.status === "success") {
                    counts.success++;
                }
                else if (run.status === "failed" || run.status === "timeout") {
                    counts.failure++;
                }
            }
        }

        // Convert to array and sort chronologically (oldest first)
        return Array.from(dateMap.entries())
            .map(([date, counts]) => ({
                date,
                success: counts.success,
                failure: counts.failure,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * Get top endpoints by run count with health metrics.
     *
     * @param userId - The user ID
     * @param limit - Maximum number of endpoints to return
     * @returns Top endpoints with success rates and run counts
     */
    private async getTopEndpoints(
        userId: string,
        limit: number,
    ): Promise<TopEndpoint[]> {
        // Get all jobs and endpoints
        const jobs = await this.jobsRepo.listJobs(userId, { status: "active" });
        const jobMap = new Map(jobs.map(job => [job.id, job.name]));

        const allEndpoints = await Promise.all(
            jobs.map(job => this.jobsRepo.listEndpointsByJob(job.id)),
        );
        const endpoints = allEndpoints.flat();

        if (endpoints.length === 0) {
            return [];
        }

        const now = this.clock.now();
        const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

        // Fetch health summaries for all endpoints
        const healthSummaries = await Promise.all(
            endpoints.map(ep => this.runsRepo.getHealthSummary(ep.id, since)),
        );

        // Combine endpoint data with health metrics
        const endpointStats = endpoints.map((ep, idx) => {
            const health = healthSummaries[idx];
            const runCount = health.successCount + health.failureCount;
            const successRate = runCount > 0
                ? (health.successCount / runCount) * 100
                : 0;

            return {
                id: ep.id,
                name: ep.name,
                jobName: jobMap.get(ep.jobId!) || "Unknown Job",
                successRate: Math.round(successRate * 10) / 10,
                lastRunAt: health.lastRun?.at ?? null,
                runCount,
            };
        });

        // Sort by run count (descending) and take top N
        return endpointStats
            .sort((a, b) => b.runCount - a.runCount)
            .slice(0, limit);
    }

    /**
     * Get most recent runs across all endpoints.
     *
     * @param userId - The user ID
     * @param limit - Maximum number of runs to return
     * @returns Recent runs with endpoint/job context
     */
    private async getRecentRunsGlobal(
        userId: string,
        limit: number,
    ): Promise<RecentRun[]> {
        // Fetch recent runs
        const { runs } = await this.runsRepo.listRuns({
            userId,
            limit,
        });

        // Get unique endpoint IDs
        const endpointIds = [...new Set(runs.map(run => run.endpointId))];

        // Fetch endpoint details in parallel
        const endpoints = await Promise.all(
            endpointIds.map(id => this.jobsRepo.getEndpoint(id)),
        );

        // Create lookup maps
        const endpointMap = new Map(
            endpoints.filter(Boolean).map(ep => [ep!.id, ep!]),
        );

        const jobIds = [...new Set(endpoints.filter(Boolean).map(ep => ep!.jobId!))];
        const jobs = await Promise.all(
            jobIds.map(id => this.jobsRepo.getJob(id!)),
        );
        const jobMap = new Map(
            jobs.filter(Boolean).map(job => [job!.id, job!.name]),
        );

        // Enrich runs with endpoint/job names
        return runs.map((run) => {
            const endpoint = endpointMap.get(run.endpointId);
            const jobName = endpoint ? jobMap.get(endpoint.jobId!) || "Unknown Job" : "Unknown Job";

            return {
                id: run.runId,
                endpointId: run.endpointId,
                endpointName: endpoint?.name || "Unknown Endpoint",
                jobName,
                status: run.status,
                startedAt: run.startedAt,
                durationMs: run.durationMs ?? null,
                source: run.source ?? null,
            };
        });
    }
}
