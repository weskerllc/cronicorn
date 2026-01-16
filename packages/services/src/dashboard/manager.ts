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
   * @param options.jobId - Filter by job ID (optional)
   * @param options.source - Filter by scheduling source (optional)
   * @param options.startDate - Start date for filtering runs (required)
   * @param options.endDate - End date for filtering runs (required)
   * @param options.endpointLimit - Maximum number of endpoints in time-series (default: 20)
   * @returns Aggregated dashboard statistics
   */
  async getDashboardStats(
    userId: string,
    options: {
      jobId?: string;
      source?: string;
      startDate: Date;
      endDate: Date;
      endpointLimit?: number;
    },
  ): Promise<DashboardStats> {
    const now = this.clock.now();

    // Calculate span in days for granularity and bucketing decisions
    const spanMs = options.endDate.getTime() - options.startDate.getTime();
    const spanDays = Math.max(1, Math.ceil(spanMs / (24 * 60 * 60 * 1000)));

    // Use hourly granularity for spans of 1 day or less
    const useHourlyGranularity = spanDays <= 1;

    // Build filter object for queries
    const filters = {
      userId,
      jobId: options.jobId,
      source: options.source,
      sinceDate: options.startDate,
      untilDate: options.endDate,
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
      this.calculateOverallSuccessRate(userId, spanDays),
      this.getRecentActivity(userId, now),
      // Aggregated queries - respects date range filter
      this.runsRepo.getJobHealthDistribution(userId, { sinceDate: filters.sinceDate, untilDate: filters.untilDate }),
      this.runsRepo.getFilteredMetrics(filters),
      // sourceDistribution should NOT be filtered by source (only by jobId and date range)
      // This allows it to show the full distribution while other charts are filtered
      this.runsRepo.getSourceDistribution({
        userId,
        jobId: filters.jobId,
        sinceDate: filters.sinceDate,
        untilDate: filters.untilDate,
        // Explicitly omit source filter
      }),
      this.getRunTimeSeries(userId, spanDays, now, filters),
      this.getEndpointTimeSeries(userId, spanDays, now, { ...filters, endpointLimit: options.endpointLimit ?? 20 }),
      this.getAISessionTimeSeries(userId, spanDays, now, { ...filters, endpointLimit: options.endpointLimit ?? 20 }),
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
   * @param now - Current timestamp (unused, kept for API compatibility)
   * @param filters - Filter options
   * @param filters.userId - User ID filter
   * @param filters.jobId - Job ID filter (optional)
   * @param filters.source - Scheduling source filter (optional)
   * @param filters.sinceDate - Start date for filtering runs
   * @param filters.untilDate - End date for filtering runs
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
      sinceDate: Date;
      untilDate: Date;
      granularity: "hour" | "day";
    },
  ): Promise<RunTimeSeriesPoint[]> {
    // Get aggregated data from repository (SQL aggregation)
    const aggregatedData = await this.runsRepo.getRunTimeSeries(filters);

    // Use the actual date range from filters, not "now" minus days
    const rangeStart = filters.sinceDate;
    const rangeEnd = filters.untilDate;

    // If hourly granularity, fill in hourly buckets instead of daily
    if (filters.granularity === "hour") {
      const dataMap = new Map(
        aggregatedData.map(item => [item.date, item]),
      );

      // Fill in all hours for the time period, from rangeStart to rangeEnd
      const result: RunTimeSeriesPoint[] = [];

      // Start from the beginning of the start hour
      const startHour = new Date(rangeStart);
      startHour.setMinutes(0, 0, 0);

      // End at the beginning of the end hour
      const endHour = new Date(rangeEnd);
      endHour.setMinutes(0, 0, 0);

      for (let t = startHour.getTime(); t <= endHour.getTime(); t += 60 * 60 * 1000) {
        const currentHour = new Date(t);
        const dateStr = `${currentHour.getFullYear()}-${String(currentHour.getMonth() + 1).padStart(2, "0")}-${String(currentHour.getDate()).padStart(2, "0")} ${String(currentHour.getHours()).padStart(2, "0")}:00:00`;
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
        // Calculate bucket key based on rangeStart, not now
        const daysSinceStart = Math.floor((date.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000));
        const bucketIndex = Math.floor(daysSinceStart / bucketDays);
        const bucketStart = new Date(rangeStart.getTime() + (bucketIndex * bucketDays * 24 * 60 * 60 * 1000));
        const bucketKey = bucketStart.toISOString().split("T")[0];

        const existing = bucketMap.get(bucketKey) || { success: 0, failure: 0 };
        existing.success += item.success;
        existing.failure += item.failure;
        bucketMap.set(bucketKey, existing);
      });

      // Fill in missing buckets with zeros
      const result: RunTimeSeriesPoint[] = [];
      const numBuckets = Math.ceil(days / bucketDays);
      for (let i = 0; i < numBuckets; i++) {
        const bucketStart = new Date(rangeStart.getTime() + (i * bucketDays * 24 * 60 * 60 * 1000));
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

    // Initialize all days with zero counts from rangeStart to rangeEnd
    const result: RunTimeSeriesPoint[] = [];
    const startTime = new Date(rangeStart);
    startTime.setUTCHours(0, 0, 0, 0);
    const endTime = new Date(rangeEnd);
    endTime.setUTCHours(0, 0, 0, 0);

    for (let t = startTime.getTime(); t <= endTime.getTime(); t += 24 * 60 * 60 * 1000) {
      const dateStr = new Date(t).toISOString().split("T")[0];
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
   * @param now - Current timestamp (unused, kept for API compatibility)
   * @param filters - Filter options
   * @param filters.endpointLimit - Maximum number of endpoints to include (sorted by run count DESC)
   * @param filters.userId - User ID filter
   * @param filters.jobId - Job ID filter (optional)
   * @param filters.source - Scheduling source filter (optional)
   * @param filters.sinceDate - Start date for filtering runs
   * @param filters.untilDate - End date for filtering runs
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
      untilDate: Date;
      endpointLimit?: number;
      granularity: "hour" | "day";
    },
  ): Promise<EndpointTimeSeriesPoint[]> {
    // Get aggregated data from repository (SQL aggregation)
    const aggregatedData = await this.runsRepo.getEndpointTimeSeries(filters);

    // Use the actual date range from filters, not "now" minus days
    const rangeStart = filters.sinceDate;
    const rangeEnd = filters.untilDate;

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

      // Fill in all hours for all endpoints, from rangeStart to rangeEnd
      const result: EndpointTimeSeriesPoint[] = [];

      // Start from the beginning of the start hour
      const startHour = new Date(rangeStart);
      startHour.setMinutes(0, 0, 0);

      // End at the beginning of the end hour
      const endHour = new Date(rangeEnd);
      endHour.setMinutes(0, 0, 0);

      for (let t = startHour.getTime(); t <= endHour.getTime(); t += 60 * 60 * 1000) {
        const currentHour = new Date(t);
        const dateStr = `${currentHour.getFullYear()}-${String(currentHour.getMonth() + 1).padStart(2, "0")}-${String(currentHour.getDate()).padStart(2, "0")} ${String(currentHour.getHours()).padStart(2, "0")}:00:00`;

        endpoints.forEach((endpoint) => {
          const key = `${dateStr}-${endpoint.id}`;
          const existing = dataMap.get(key);
          result.push({
            date: dateStr,
            endpointId: endpoint.id,
            endpointName: endpoint.name,
            success: existing?.success ?? 0,
            failure: existing?.failure ?? 0,
            totalDurationMs: existing?.totalDurationMs ?? 0,
          });
        });
      }
      return result;
    }

    const { bucketDays } = getTimeBucketSize(days);

    // If using multi-day buckets, aggregate the daily data per endpoint
    if (bucketDays > 1) {
      const bucketMap = new Map<string, { success: number; failure: number; totalDurationMs: number }>();

      aggregatedData.forEach((item) => {
        const date = new Date(item.date);
        // Calculate bucket key based on rangeStart, not now
        const daysSinceStart = Math.floor((date.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000));
        const bucketIndex = Math.floor(daysSinceStart / bucketDays);
        const bucketStart = new Date(rangeStart.getTime() + (bucketIndex * bucketDays * 24 * 60 * 60 * 1000));
        const bucketKey = `${bucketStart.toISOString().split("T")[0]}-${item.endpointId}`;

        const existing = bucketMap.get(bucketKey) || { success: 0, failure: 0, totalDurationMs: 0 };
        existing.success += item.success;
        existing.failure += item.failure;
        existing.totalDurationMs += item.totalDurationMs;
        bucketMap.set(bucketKey, existing);
      });

      // Fill in missing buckets with zeros
      const result: EndpointTimeSeriesPoint[] = [];
      const numBuckets = Math.ceil(days / bucketDays);
      for (let i = 0; i < numBuckets; i++) {
        const bucketStart = new Date(rangeStart.getTime() + (i * bucketDays * 24 * 60 * 60 * 1000));
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
            totalDurationMs: existing?.totalDurationMs ?? 0,
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

    // Initialize all days for all endpoints with zero counts from rangeStart to rangeEnd
    const result: EndpointTimeSeriesPoint[] = [];
    const startTime = new Date(rangeStart);
    startTime.setUTCHours(0, 0, 0, 0);
    const endTime = new Date(rangeEnd);
    endTime.setUTCHours(0, 0, 0, 0);

    for (let t = startTime.getTime(); t <= endTime.getTime(); t += 24 * 60 * 60 * 1000) {
      const dateStr = new Date(t).toISOString().split("T")[0];

      endpoints.forEach((endpoint) => {
        const key = `${dateStr}-${endpoint.id}`;
        const existing = dataMap.get(key);
        result.push({
          date: dateStr,
          endpointId: endpoint.id,
          endpointName: endpoint.name,
          success: existing?.success ?? 0,
          failure: existing?.failure ?? 0,
          totalDurationMs: existing?.totalDurationMs ?? 0,
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
   * @param now - Current timestamp (unused, kept for API compatibility)
   * @param filters - Filter options
   * @param filters.userId - User ID filter
   * @param filters.jobId - Job ID filter (optional)
   * @param filters.sinceDate - Start date for filtering sessions
   * @param filters.untilDate - End date for filtering sessions
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
      untilDate: Date;
      endpointLimit?: number;
      granularity: "hour" | "day";
    },
  ): Promise<AISessionTimeSeriesPoint[]> {
    // Get aggregated data from repository (SQL aggregation by date + endpoint)
    const aggregatedData = await this.sessionsRepo.getAISessionTimeSeries(filters);

    // Use the actual date range from filters, not "now" minus days
    const rangeStart = filters.sinceDate;
    const rangeEnd = filters.untilDate;

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

      // Fill in all hours for all endpoints, from rangeStart to rangeEnd
      const result: AISessionTimeSeriesPoint[] = [];

      // Start from the beginning of the start hour
      const startHour = new Date(rangeStart);
      startHour.setMinutes(0, 0, 0);

      // End at the beginning of the end hour
      const endHour = new Date(rangeEnd);
      endHour.setMinutes(0, 0, 0);

      for (let t = startHour.getTime(); t <= endHour.getTime(); t += 60 * 60 * 1000) {
        const currentHour = new Date(t);
        const dateStr = `${currentHour.getFullYear()}-${String(currentHour.getMonth() + 1).padStart(2, "0")}-${String(currentHour.getDate()).padStart(2, "0")} ${String(currentHour.getHours()).padStart(2, "0")}:00:00`;

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
        // Calculate bucket key based on rangeStart, not now
        const daysSinceStart = Math.floor((date.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000));
        const bucketIndex = Math.floor(daysSinceStart / bucketDays);
        const bucketStart = new Date(rangeStart.getTime() + (bucketIndex * bucketDays * 24 * 60 * 60 * 1000));
        const bucketKey = `${bucketStart.toISOString().split("T")[0]}_${item.endpointId}`;

        const existing = bucketMap.get(bucketKey) || { sessionCount: 0, totalTokens: 0 };
        existing.sessionCount += item.sessionCount;
        existing.totalTokens += item.totalTokens;
        bucketMap.set(bucketKey, existing);
      });

      // Fill in missing buckets with zeros
      const result: AISessionTimeSeriesPoint[] = [];
      const numBuckets = Math.ceil(days / bucketDays);
      for (let i = 0; i < numBuckets; i++) {
        const bucketStart = new Date(rangeStart.getTime() + (i * bucketDays * 24 * 60 * 60 * 1000));
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

    // Initialize all days for all endpoints with zero counts from rangeStart to rangeEnd
    const result: AISessionTimeSeriesPoint[] = [];
    const startTime = new Date(rangeStart);
    startTime.setUTCHours(0, 0, 0, 0);
    const endTime = new Date(rangeEnd);
    endTime.setUTCHours(0, 0, 0, 0);

    for (let t = startTime.getTime(); t <= endTime.getTime(); t += 24 * 60 * 60 * 1000) {
      const dateStr = new Date(t).toISOString().split("T")[0];

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
   * Get combined activity timeline for a job (or all jobs).
   * Merges runs and AI sessions into a single chronological timeline.
   *
   * @param userId - The user ID
   * @param jobId - Optional job ID (omit for all jobs)
   * @param options - Query options
   * @param options.startDate - Start date for filtering events (required)
   * @param options.endDate - End date for filtering events (required)
   * @param options.eventType - Filter by event type: 'all', 'runs', or 'sessions' (default: 'all')
   * @param options.limit - Maximum events to return (default: 50)
   * @param options.offset - Pagination offset (default: 0)
   * @returns Combined timeline of runs and AI sessions
   */
  async getJobActivityTimeline(
    userId: string,
    jobId: string | undefined,
    options: {
      startDate: Date;
      endDate: Date;
      eventType?: "all" | "runs" | "sessions";
      limit?: number;
      offset?: number;
    },
  ): Promise<JobActivityTimeline> {
    const limit = Math.min(options.limit ?? 50, 100);
    const offset = options.offset ?? 0;
    const eventType = options.eventType ?? "all";

    // Fetch runs and sessions based on eventType filter
    // Only fetch what we need for efficiency
    const fetchLimit = limit + offset;

    const shouldFetchRuns = eventType === "all" || eventType === "runs";
    const shouldFetchSessions = eventType === "all" || eventType === "sessions";

    const [runsResult, sessionsResult] = await Promise.all([
      shouldFetchRuns
        ? this.runsRepo.getJobRuns({
            userId,
            jobId,
            sinceDate: options.startDate,
            untilDate: options.endDate,
            limit: fetchLimit,
            offset: 0,
          })
        : { runs: [], total: 0 },
      shouldFetchSessions
        ? this.sessionsRepo.getJobSessions({
            userId,
            jobId,
            sinceDate: options.startDate,
            untilDate: options.endDate,
            limit: fetchLimit,
            offset: 0,
          })
        : { sessions: [], total: 0 },
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
    // Calculate success rate as percentage with one decimal place
    const successRate = totalRuns > 0
      ? Number(((successfulRuns / totalRuns) * 100).toFixed(1))
      : 0;

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
