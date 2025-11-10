import type { Clock, JobsRepo, RunsRepo, SessionsRepo } from "@cronicorn/domain";

import type {
  AISessionTimeSeriesPoint,
  DashboardStats,
  EndpointStats,
  EndpointTimeSeriesPoint,
  JobStats,
  RecentActivityStats,
  RunTimeSeriesPoint,
  SuccessRateStats,
} from "./types.js";

/**
 * DashboardManager aggregates data from multiple repos to provide
 * high-level statistics and metrics for the user dashboard.
 *
 * **Architecture**:
 * - Depends ONLY on domain ports (JobsRepo, RunsRepo, SessionsRepo, Clock)
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
 *   const sessionsRepo = new DrizzleSessionsRepo(tx);
 *   const clock = new SystemClock();
 *   const manager = new DashboardManager(jobsRepo, runsRepo, sessionsRepo, clock);
 *
 *   const stats = await manager.getDashboardStats(userId, { days: 7 });
 * });
 * ```
 */
export class DashboardManager {
  constructor(
    private readonly jobsRepo: JobsRepo,
    private readonly runsRepo: RunsRepo,
    private readonly sessionsRepo: SessionsRepo,
    private readonly clock: Clock,
  ) { }

  /**
   * Get comprehensive dashboard statistics for a user.
   *
   * @param userId - The user ID
   * @param options - Query options
   * @param options.days - Number of days for time-series data (default: 7, max: 30)
   * @param options.jobId - Filter by job ID (optional)
   * @param options.source - Filter by scheduling source (optional)
   * @param options.timeRange - Time range filter: 24h, 7d, 30d, all (optional)
   * @param options.endpointLimit - Maximum number of endpoints in time-series (default: 20)
   * @returns Aggregated dashboard statistics
   */
  async getDashboardStats(
    userId: string,
    options: {
      days?: number;
      jobId?: string;
      source?: string;
      timeRange?: "24h" | "7d" | "30d" | "all";
      endpointLimit?: number;
    } = {},
  ): Promise<DashboardStats> {
    const days = Math.min(options.days ?? 7, 30);
    const now = this.clock.now();

    // Convert timeRange to sinceDate for filtering runs
    let sinceDate: Date | undefined;
    if (options.timeRange) {
      switch (options.timeRange) {
        case "24h":
          sinceDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          sinceDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          sinceDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "all":
          sinceDate = undefined; // No time filter
          break;
      }
    }

    // If no timeRange specified, use days for sinceDate
    if (!sinceDate) {
      sinceDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    // Build filter object for queries
    const filters = {
      userId,
      jobId: options.jobId,
      source: options.source,
      sinceDate: sinceDate!, // Always defined by this point
    };

    // Execute queries in parallel for performance
    const [
      jobs,
      endpoints,
      successRate,
      recentActivity,
      jobHealth,
      filteredMetrics,
      sourceDistribution,
      runTimeSeries,
      endpointTimeSeries,
      aiSessionTimeSeries,
    ] = await Promise.all([
      this.getJobsStats(userId),
      this.getEndpointsStats(userId),
      this.calculateOverallSuccessRate(userId, days),
      this.getRecentActivity(userId, now),
      // New aggregated queries
      this.runsRepo.getJobHealthDistribution(userId),
      this.runsRepo.getFilteredMetrics(filters),
      // sourceDistribution should NOT be filtered by source (only by jobId and sinceDate)
      // This allows it to show the full distribution while other charts are filtered
      this.runsRepo.getSourceDistribution({
        userId,
        jobId: filters.jobId,
        sinceDate: filters.sinceDate,
        // Explicitly omit source filter
      }),
      this.getRunTimeSeries(userId, days, now, filters),
      this.getEndpointTimeSeries(userId, days, now, { ...filters, endpointLimit: options.endpointLimit ?? 20 }),
      this.getAISessionTimeSeries(userId, days, now, { ...filters, endpointLimit: options.endpointLimit ?? 20 }),
    ]);

    return {
      jobs,
      endpoints,
      successRate,
      recentActivity,
      jobHealth,
      filteredMetrics,
      sourceDistribution,
      runTimeSeries,
      endpointTimeSeries,
      aiSessionTimeSeries,
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
    const now = this.clock.now();

    // Use aggregated query to count endpoints directly from database
    const stats = await this.jobsRepo.getEndpointCounts(userId, now);

    return {
      total: stats.total,
      active: stats.active,
      paused: stats.paused,
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
    const now = this.clock.now();
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(
      periodStart.getTime() - days * 24 * 60 * 60 * 1000,
    );

    // Use aggregated queries instead of fetching per-endpoint
    const [currentMetrics, previousMetrics] = await Promise.all([
      this.runsRepo.getFilteredMetrics({
        userId,
        sinceDate: periodStart,
      }),
      this.runsRepo.getFilteredMetrics({
        userId,
        sinceDate: previousPeriodStart,
      }),
    ]);

    // Calculate current period success rate
    const currentTotal = currentMetrics.successCount + currentMetrics.failureCount;
    const currentRate = currentTotal > 0 ? (currentMetrics.successCount / currentTotal) * 100 : 0;

    // Calculate previous period success rate
    const previousTotal = previousMetrics.successCount + previousMetrics.failureCount;
    const previousRate = previousTotal > 0 ? (previousMetrics.successCount / previousTotal) * 100 : 0;

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
   * @param filters - Filter options
   * @param filters.userId - User ID filter
   * @param filters.jobId - Job ID filter (optional)
   * @param filters.source - Scheduling source filter (optional)
   * @param filters.sinceDate - Start date for filtering runs
   * @returns Array of daily run counts
   */
  private async getRunTimeSeries(
    userId: string,
    days: number,
    now: Date,
    filters: {
      userId: string;
      jobId?: string;
      source?: string;
      sinceDate: Date; // Required for this method
    },
  ): Promise<RunTimeSeriesPoint[]> {
    // Get aggregated data from repository (SQL aggregation)
    const aggregatedData = await this.runsRepo.getRunTimeSeries(filters);

    // Create a map of dates for quick lookup
    const dataMap = new Map(
      aggregatedData.map(item => [item.date, item]),
    );

    // Initialize all days with zero counts to ensure complete time series
    const result: RunTimeSeriesPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];

      const existing = dataMap.get(dateStr);
      result.push({
        date: dateStr,
        success: existing?.success ?? 0,
        failure: existing?.failure ?? 0,
      });
    }

    return result;
  }

  /**
   * Get time-series data for run activity grouped by endpoint.
   *
   * @param userId - The user ID
   * @param days - Number of days to include
   * @param now - Current timestamp
   * @param filters - Filter options
   * @param filters.endpointLimit - Maximum number of endpoints to include (sorted by run count DESC)
   * @param filters.userId - User ID filter
   * @param filters.jobId - Job ID filter (optional)
   * @param filters.source - Scheduling source filter (optional)
   * @param filters.sinceDate - Start date for filtering runs
   * @returns Array of daily run counts by endpoint
   */
  private async getEndpointTimeSeries(
    userId: string,
    days: number,
    now: Date,
    filters: {
      userId: string;
      jobId?: string;
      source?: string;
      sinceDate: Date;
      endpointLimit?: number;
    },
  ): Promise<EndpointTimeSeriesPoint[]> {
    // Get aggregated data from repository (SQL aggregation)
    const aggregatedData = await this.runsRepo.getEndpointTimeSeries(filters);

    // Get unique endpoints
    const endpoints = new Map<string, { id: string; name: string }>();
    aggregatedData.forEach((item) => {
      if (!endpoints.has(item.endpointId)) {
        endpoints.set(item.endpointId, { id: item.endpointId, name: item.endpointName });
      }
    });

    // Create a map for quick lookup: date-endpointId -> data
    const dataMap = new Map<string, typeof aggregatedData[0]>();
    aggregatedData.forEach((item) => {
      const key = `${item.date}-${item.endpointId}`;
      dataMap.set(key, item);
    });

    // Initialize all days for all endpoints with zero counts
    const result: EndpointTimeSeriesPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];

      endpoints.forEach((endpoint) => {
        const key = `${dateStr}-${endpoint.id}`;
        const existing = dataMap.get(key);
        result.push({
          date: dateStr,
          endpointId: endpoint.id,
          endpointName: endpoint.name,
          success: existing?.success ?? 0,
          failure: existing?.failure ?? 0,
        });
      });
    }

    return result;
  }

  /**
   * Get time-series data for AI session activity.
   *
   * @param userId - The user ID
   * @param days - Number of days to include
   * @param now - Current timestamp
   * @param filters - Filter options
   * @param filters.userId - User ID filter
   * @param filters.jobId - Job ID filter (optional)
   * @param filters.sinceDate - Start date for filtering sessions
   * @param filters.endpointLimit - Maximum number of endpoints to include (sorted by session count DESC)
   * @returns Array of daily AI session counts
   */
  private async getAISessionTimeSeries(
    userId: string,
    days: number,
    now: Date,
    filters: {
      userId: string;
      jobId?: string;
      sinceDate: Date;
      endpointLimit?: number;
    },
  ): Promise<AISessionTimeSeriesPoint[]> {
    // Get aggregated data from repository (SQL aggregation by date + endpoint)
    const aggregatedData = await this.sessionsRepo.getAISessionTimeSeries(filters);

    // Get unique endpoints
    const endpointMap = new Map<string, { id: string; name: string }>();
    aggregatedData.forEach((item) => {
      if (!endpointMap.has(item.endpointId)) {
        endpointMap.set(item.endpointId, {
          id: item.endpointId,
          name: item.endpointName,
        });
      }
    });

    // Create a map of date+endpoint for quick lookup
    const dataMap = new Map(
      aggregatedData.map(item => [`${item.date}_${item.endpointId}`, item]),
    );

    // Initialize all days for all endpoints with zero counts (cartesian product)
    const result: AISessionTimeSeriesPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];

      // For each date, add entry for every endpoint
      endpointMap.forEach((endpoint) => {
        const existing = dataMap.get(`${dateStr}_${endpoint.id}`);
        result.push({
          date: dateStr,
          endpointId: endpoint.id,
          endpointName: endpoint.name,
          sessionCount: existing?.sessionCount ?? 0,
          totalTokens: existing?.totalTokens ?? 0,
        });
      });
    }

    return result;
  }
}
