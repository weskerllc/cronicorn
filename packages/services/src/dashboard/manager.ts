import type { Clock, JobsRepo, RunsRepo, SessionsRepo } from "@cronicorn/domain";

import type {
  ActivityEvent,
  AISessionTimeSeriesPoint,
  DashboardStats,
  EndpointStats,
  EndpointTimeSeriesPoint,
  JobActivityTimeline,
  JobStats,
  RecentActivityStats,
  RunTimeSeriesPoint,
  SuccessRateStats,
} from "./types.js";

/**
 * Calculate time bucket granularity based on number of days.
 * This prevents sending too many data points to the frontend.
 *
 * Strategy:
 * - 1-2 days: Daily buckets (1-2 points)
 * - 3-7 days: Daily buckets (3-7 points)
 * - 8-14 days: Daily buckets (8-14 points)
 * - 15-30 days: 3-day buckets (~10 points)
 */
function getTimeBucketSize(days: number): { bucketDays: number; bucketSql: string } {
  if (days <= 14) {
    // Daily granularity for 2 weeks or less
    return { bucketDays: 1, bucketSql: "DATE" };
  }
  else {
    // 3-day buckets for longer ranges (reduces 30 days to ~10 buckets)
    return { bucketDays: 3, bucketSql: "WEEK_BUCKET" };
  }
}

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

    // Determine if we should use hourly granularity (for 24h view)
    const useHourlyGranularity = options.timeRange === "24h";

    // Build filter object for queries
    const filters = {
      userId,
      jobId: options.jobId,
      source: options.source,
      sinceDate: sinceDate!, // Always defined by this point
      granularity: useHourlyGranularity ? ("hour" as const) : ("day" as const),
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

    // Calculate max stacked values for chart Y-axis domains
    const endpointTimeSeriesMaxStacked = this.calculateMaxStackedValue(
      endpointTimeSeries,
      point => point.success + point.failure,
    );
    const aiSessionTimeSeriesMaxStacked = this.calculateMaxStackedValue(
      aiSessionTimeSeries,
      point => point.sessionCount,
    );

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
      endpointTimeSeriesMaxStacked,
      aiSessionTimeSeries,
      aiSessionTimeSeriesMaxStacked,
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
   * @param filters.granularity - Time bucket granularity (hour or day)
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
      granularity: "hour" | "day";
    },
  ): Promise<RunTimeSeriesPoint[]> {
    // Get aggregated data from repository (SQL aggregation)
    const aggregatedData = await this.runsRepo.getRunTimeSeries(filters);

    // If hourly granularity, fill in hourly buckets instead of daily
    if (filters.granularity === "hour") {
      const dataMap = new Map(
        aggregatedData.map(item => [item.date, item]),
      );

      // Fill in all hours for the time period, aligned to hour boundaries
      const result: RunTimeSeriesPoint[] = [];
      const hours = days * 24;

      // Start from the beginning of the current hour, go back hours-1 more hours
      const currentHourStart = new Date(now);
      currentHourStart.setMinutes(0, 0, 0);

      for (let i = hours - 1; i >= 0; i--) {
        const date = new Date(currentHourStart.getTime() - i * 60 * 60 * 1000);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00:00`;
        const existing = dataMap.get(dateStr);
        result.push({
          date: dateStr,
          success: existing?.success ?? 0,
          failure: existing?.failure ?? 0,
        });
      }
      return result;
    }

    const { bucketDays } = getTimeBucketSize(days);

    // If using multi-day buckets, aggregate the daily data
    if (bucketDays > 1) {
      const bucketMap = new Map<string, { success: number; failure: number }>();

      aggregatedData.forEach((item) => {
        const date = new Date(item.date);
        // Calculate bucket key (round down to nearest bucket)
        const daysSinceStart = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
        const bucketIndex = Math.floor(daysSinceStart / bucketDays);
        const bucketStart = new Date(now.getTime() - (bucketIndex * bucketDays * 24 * 60 * 60 * 1000));
        const bucketKey = bucketStart.toISOString().split("T")[0];

        const existing = bucketMap.get(bucketKey) || { success: 0, failure: 0 };
        existing.success += item.success;
        existing.failure += item.failure;
        bucketMap.set(bucketKey, existing);
      });

      // Fill in missing buckets with zeros
      const result: RunTimeSeriesPoint[] = [];
      const numBuckets = Math.ceil(days / bucketDays);
      for (let i = numBuckets - 1; i >= 0; i--) {
        const bucketStart = new Date(now.getTime() - (i * bucketDays * 24 * 60 * 60 * 1000));
        const dateStr = bucketStart.toISOString().split("T")[0];
        const existing = bucketMap.get(dateStr);
        result.push({
          date: dateStr,
          success: existing?.success ?? 0,
          failure: existing?.failure ?? 0,
        });
      }
      return result;
    }

    // Daily granularity - create a map for quick lookup
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
   * @param filters.granularity - Time bucket granularity (hour or day)
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
      granularity: "hour" | "day";
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

    // If hourly granularity, fill in hourly buckets
    if (filters.granularity === "hour") {
      const dataMap = new Map<string, typeof aggregatedData[0]>();
      aggregatedData.forEach((item) => {
        const key = `${item.date}-${item.endpointId}`;
        dataMap.set(key, item);
      });

      // Fill in all hours for all endpoints, aligned to hour boundaries
      const result: EndpointTimeSeriesPoint[] = [];
      const hours = days * 24;

      // Start from the beginning of the current hour, go back hours-1 more hours
      const currentHourStart = new Date(now);
      currentHourStart.setMinutes(0, 0, 0);

      for (let i = hours - 1; i >= 0; i--) {
        const date = new Date(currentHourStart.getTime() - i * 60 * 60 * 1000);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00:00`;

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

    const { bucketDays } = getTimeBucketSize(days);

    // If using multi-day buckets, aggregate the daily data per endpoint
    if (bucketDays > 1) {
      const bucketMap = new Map<string, { success: number; failure: number }>();

      aggregatedData.forEach((item) => {
        const date = new Date(item.date);
        const daysSinceStart = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
        const bucketIndex = Math.floor(daysSinceStart / bucketDays);
        const bucketStart = new Date(now.getTime() - (bucketIndex * bucketDays * 24 * 60 * 60 * 1000));
        const bucketKey = `${bucketStart.toISOString().split("T")[0]}-${item.endpointId}`;

        const existing = bucketMap.get(bucketKey) || { success: 0, failure: 0 };
        existing.success += item.success;
        existing.failure += item.failure;
        bucketMap.set(bucketKey, existing);
      });

      // Fill in missing buckets with zeros
      const result: EndpointTimeSeriesPoint[] = [];
      const numBuckets = Math.ceil(days / bucketDays);
      for (let i = numBuckets - 1; i >= 0; i--) {
        const bucketStart = new Date(now.getTime() - (i * bucketDays * 24 * 60 * 60 * 1000));
        const dateStr = bucketStart.toISOString().split("T")[0];

        endpoints.forEach((endpoint) => {
          const key = `${dateStr}-${endpoint.id}`;
          const existing = bucketMap.get(key);
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

    // Daily granularity - create a map for quick lookup
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
   * @param filters.granularity - Time bucket granularity (hour or day)
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
      granularity: "hour" | "day";
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

    // If hourly granularity, fill in hourly buckets
    if (filters.granularity === "hour") {
      const dataMap = new Map(
        aggregatedData.map(item => [`${item.date}_${item.endpointId}`, item]),
      );

      // Fill in all hours for all endpoints, aligned to hour boundaries
      const result: AISessionTimeSeriesPoint[] = [];
      const hours = days * 24;

      // Start from the beginning of the current hour, go back hours-1 more hours
      const currentHourStart = new Date(now);
      currentHourStart.setMinutes(0, 0, 0);

      for (let i = hours - 1; i >= 0; i--) {
        const date = new Date(currentHourStart.getTime() - i * 60 * 60 * 1000);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00:00`;

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

    const { bucketDays } = getTimeBucketSize(days);

    // If using multi-day buckets, aggregate the daily data per endpoint
    if (bucketDays > 1) {
      const bucketMap = new Map<string, { sessionCount: number; totalTokens: number }>();

      aggregatedData.forEach((item) => {
        const date = new Date(item.date);
        const daysSinceStart = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
        const bucketIndex = Math.floor(daysSinceStart / bucketDays);
        const bucketStart = new Date(now.getTime() - (bucketIndex * bucketDays * 24 * 60 * 60 * 1000));
        const bucketKey = `${bucketStart.toISOString().split("T")[0]}_${item.endpointId}`;

        const existing = bucketMap.get(bucketKey) || { sessionCount: 0, totalTokens: 0 };
        existing.sessionCount += item.sessionCount;
        existing.totalTokens += item.totalTokens;
        bucketMap.set(bucketKey, existing);
      });

      // Fill in missing buckets with zeros
      const result: AISessionTimeSeriesPoint[] = [];
      const numBuckets = Math.ceil(days / bucketDays);
      for (let i = numBuckets - 1; i >= 0; i--) {
        const bucketStart = new Date(now.getTime() - (i * bucketDays * 24 * 60 * 60 * 1000));
        const dateStr = bucketStart.toISOString().split("T")[0];

        endpointMap.forEach((endpoint) => {
          const existing = bucketMap.get(`${dateStr}_${endpoint.id}`);
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

    // Daily granularity - create a map for quick lookup
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

  /**
   * Calculate maximum stacked value for Y-axis domain in stacked area charts.
   *
   * Groups time-series data by date and sums the values across all endpoints
   * to find the maximum cumulative value. Adds 10% padding to prevent chart
   * lines from touching the top axis.
   *
   * @param timeSeries - Array of time-series points with date and endpoint data
   * @param valueExtractor - Function to extract the numeric value from each point
   * @returns Maximum stacked value with 10% padding, or 0 if no data
   */
  private calculateMaxStackedValue<T extends { date: string; endpointId: string }>(
    timeSeries: T[],
    valueExtractor: (point: T) => number,
  ): number {
    if (timeSeries.length === 0)
      return 0;

    // Group by date and sum values across all endpoints
    const dateMap = new Map<string, number>();

    timeSeries.forEach((point) => {
      const value = valueExtractor(point);
      const existing = dateMap.get(point.date) ?? 0;
      dateMap.set(point.date, existing + value);
    });

    // Find maximum stacked value across all dates
    const maxValue = Math.max(...dateMap.values());

    // Add 10% padding to prevent touching the top
    return maxValue * 1.1;
  }

  /**
   * Get combined activity timeline for a job.
   * Merges runs and AI sessions into a single chronological timeline.
   *
   * @param userId - The user ID
   * @param jobId - The job ID
   * @param options - Query options
   * @param options.timeRange - Time range filter: 24h, 7d, 30d (default: 7d)
   * @param options.limit - Maximum events to return (default: 50)
   * @param options.offset - Pagination offset (default: 0)
   * @returns Combined timeline of runs and AI sessions
   */
  async getJobActivityTimeline(
    userId: string,
    jobId: string,
    options: {
      timeRange?: "24h" | "7d" | "30d";
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<JobActivityTimeline> {
    const now = this.clock.now();
    const timeRange = options.timeRange ?? "7d";
    const limit = Math.min(options.limit ?? 50, 100);
    const offset = options.offset ?? 0;

    // Convert timeRange to sinceDate
    let sinceDate: Date;
    switch (timeRange) {
      case "24h":
        sinceDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        sinceDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        sinceDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Fetch runs and sessions in parallel
    // We fetch more than needed from each source to handle interleaving properly
    const fetchLimit = limit + offset;
    const [runsResult, sessionsResult] = await Promise.all([
      this.runsRepo.getJobRuns({
        userId,
        jobId,
        sinceDate,
        limit: fetchLimit,
        offset: 0,
      }),
      this.sessionsRepo.getJobSessions({
        userId,
        jobId,
        sinceDate,
        limit: fetchLimit,
        offset: 0,
      }),
    ]);

    // Convert runs to activity events
    const runEvents: ActivityEvent[] = runsResult.runs.map(run => ({
      type: "run" as const,
      id: run.runId,
      endpointId: run.endpointId,
      endpointName: run.endpointName,
      timestamp: run.startedAt,
      status: run.status,
      durationMs: run.durationMs,
      source: run.source,
    }));

    // Convert sessions to activity events
    const sessionEvents: ActivityEvent[] = sessionsResult.sessions.map(session => ({
      type: "session" as const,
      id: session.sessionId,
      endpointId: session.endpointId,
      endpointName: session.endpointName,
      timestamp: session.analyzedAt,
      reasoning: session.reasoning,
      toolCalls: session.toolCalls,
      tokenUsage: session.tokenUsage ?? undefined,
    }));

    // Merge and sort by timestamp (descending)
    const allEvents = [...runEvents, ...sessionEvents].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );

    // Apply pagination
    const paginatedEvents = allEvents.slice(offset, offset + limit);

    // Calculate summary statistics
    const runsInResponse = paginatedEvents.filter(e => e.type === "run");
    const sessionsInResponse = paginatedEvents.filter(e => e.type === "session");
    const successfulRuns = runsInResponse.filter(e => e.status === "success").length;
    const totalRuns = runsInResponse.length;
    const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 1000) / 10 : 0;

    return {
      events: paginatedEvents,
      total: runsResult.total + sessionsResult.total,
      summary: {
        runsCount: runsInResponse.length,
        sessionsCount: sessionsInResponse.length,
        successRate,
      },
    };
  }
}
