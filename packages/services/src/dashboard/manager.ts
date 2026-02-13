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
 * Calculate time bucket granularity based on date range span.
 * Targets ~24-36 data points for optimal chart visualization.
 *
 * Strategy:
 * - Up to 2 weeks: Hourly granularity with variable bucket sizes (1, 2, 3, 4, 6, 8, 12 hours)
 * - Beyond 2 weeks: Daily granularity with variable bucket sizes (1, 2, 3, 7, 14 days)
 *
 * Examples:
 * - 1 day → 1-hour buckets (24 points)
 * - 7 days → 6-hour buckets (28 points)
 * - 14 days → 12-hour buckets (28 points)
 * - 32 days → daily buckets (32 points)
 * - 50 days → 2-day buckets (25 points)
 * - 90 days → 3-day buckets (30 points)
 */
function getTimeGranularity(spanMs: number): {
  granularity: "hour" | "day";
  bucketSize: number; // hours if granularity='hour', days if granularity='day'
} {
  const TARGET_POINTS = 24;
  const spanHours = spanMs / (60 * 60 * 1000);
  const spanDays = spanHours / 24;

  // For spans up to ~2 weeks, use hourly granularity with variable bucket sizes
  if (spanDays <= 14) {
    const idealBucketHours = spanHours / TARGET_POINTS;
    if (idealBucketHours <= 1)
      return { granularity: "hour", bucketSize: 1 };
    if (idealBucketHours <= 2)
      return { granularity: "hour", bucketSize: 2 };
    if (idealBucketHours <= 3)
      return { granularity: "hour", bucketSize: 3 };
    if (idealBucketHours <= 5)
      return { granularity: "hour", bucketSize: 4 };
    if (idealBucketHours <= 7)
      return { granularity: "hour", bucketSize: 6 };
    if (idealBucketHours <= 10)
      return { granularity: "hour", bucketSize: 8 };
    return { granularity: "hour", bucketSize: 12 };
  }

  // For longer spans, use daily granularity with variable bucket sizes
  // Thresholds are slightly generous to prefer finer granularity when close
  const idealBucketDays = spanDays / TARGET_POINTS;
  if (idealBucketDays <= 1.5)
    return { granularity: "day", bucketSize: 1 }; // Up to ~36 days → daily
  if (idealBucketDays <= 2.5)
    return { granularity: "day", bucketSize: 2 }; // ~36-60 days → every 2 days
  if (idealBucketDays <= 5)
    return { granularity: "day", bucketSize: 3 }; // ~60-120 days → every 3 days
  if (idealBucketDays <= 12)
    return { granularity: "day", bucketSize: 7 }; // ~120-288 days → weekly
  return { granularity: "day", bucketSize: 14 }; // 288+ days → bi-weekly
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

    // Calculate span for granularity and bucketing decisions
    const spanMs = options.endDate.getTime() - options.startDate.getTime();
    const spanDays = Math.max(1, Math.ceil(spanMs / (24 * 60 * 60 * 1000)));

    // Get optimal granularity and bucket size for ~24-30 data points
    const { granularity, bucketSize } = getTimeGranularity(spanMs);

    // Build filter object for queries
    const filters = {
      userId,
      jobId: options.jobId,
      source: options.source,
      sinceDate: options.startDate,
      untilDate: options.endDate,
      granularity,
      bucketSize,
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
      this.getRunTimeSeries(userId, filters),
      this.getEndpointTimeSeries(userId, { ...filters, endpointLimit: options.endpointLimit ?? 20 }),
      this.getAISessionTimeSeries(userId, { ...filters, endpointLimit: options.endpointLimit ?? 20 }),
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
   * @param filters - Filter options
   * @param filters.userId - User ID filter
   * @param filters.jobId - Job ID filter (optional)
   * @param filters.source - Scheduling source filter (optional)
   * @param filters.sinceDate - Start date for filtering runs
   * @param filters.untilDate - End date for filtering runs
   * @param filters.granularity - Time bucket granularity (hour or day)
   * @param filters.bucketSize - Size of each bucket (hours if granularity='hour', days if granularity='day')
   * @returns Array of time-series run counts
   */
  private async getRunTimeSeries(
    userId: string,
    filters: {
      userId: string;
      jobId?: string;
      source?: string;
      sinceDate: Date;
      untilDate: Date;
      granularity: "hour" | "day";
      bucketSize: number;
    },
  ): Promise<RunTimeSeriesPoint[]> {
    // Get aggregated data from repository (SQL aggregation)
    const aggregatedData = await this.runsRepo.getRunTimeSeries(filters);

    const rangeStart = filters.sinceDate;
    const rangeEnd = filters.untilDate;

    if (filters.granularity === "hour") {
      return this.aggregateHourlyBuckets(
        aggregatedData,
        rangeStart,
        rangeEnd,
        filters.bucketSize,
        item => ({ success: item.success, failure: item.failure }),
        () => ({ success: 0, failure: 0 }),
        (acc, item) => {
          acc.success += item.success;
          acc.failure += item.failure;
          return acc;
        },
        (date, values) => ({ date, ...values }),
      );
    }

    // Daily granularity with variable bucket size
    return this.aggregateDailyBuckets(
      aggregatedData,
      rangeStart,
      rangeEnd,
      filters.bucketSize,
      item => ({ success: item.success, failure: item.failure }),
      () => ({ success: 0, failure: 0 }),
      (acc, item) => {
        acc.success += item.success;
        acc.failure += item.failure;
        return acc;
      },
      (date, values) => ({ date, ...values }),
    );
  }

  /**
   * Generic helper to aggregate hourly data into multi-hour buckets.
   */
  private aggregateHourlyBuckets<T extends { date: string }, V, R>(
    data: T[],
    rangeStart: Date,
    rangeEnd: Date,
    bucketSizeHours: number,
    extractValues: (item: T) => V,
    createEmpty: () => V,
    accumulate: (acc: V, item: V) => V,
    toResult: (date: string, values: V) => R,
  ): R[] {
    const bucketMs = bucketSizeHours * 60 * 60 * 1000;

    // Create a map of raw hourly data
    const dataMap = new Map(data.map(item => [item.date, item]));

    // Calculate bucket boundaries
    const startHour = new Date(rangeStart);
    startHour.setMinutes(0, 0, 0);
    const endHour = new Date(rangeEnd);
    endHour.setMinutes(0, 0, 0);

    // Aggregate into buckets
    const bucketMap = new Map<number, V>();

    for (let t = startHour.getTime(); t <= endHour.getTime(); t += 60 * 60 * 1000) {
      const currentHour = new Date(t);
      const dateStr = `${currentHour.getFullYear()}-${String(currentHour.getMonth() + 1).padStart(2, "0")}-${String(currentHour.getDate()).padStart(2, "0")} ${String(currentHour.getHours()).padStart(2, "0")}:00:00`;

      const existing = dataMap.get(dateStr);
      if (existing) {
        const bucketIndex = Math.floor((t - startHour.getTime()) / bucketMs);
        const bucketKey = startHour.getTime() + bucketIndex * bucketMs;
        const acc = bucketMap.get(bucketKey) ?? createEmpty();
        bucketMap.set(bucketKey, accumulate(acc, extractValues(existing)));
      }
    }

    // Fill in all buckets (including empty ones)
    const result: R[] = [];
    for (let t = startHour.getTime(); t <= endHour.getTime(); t += bucketMs) {
      const bucketDate = new Date(t);
      const dateStr = `${bucketDate.getFullYear()}-${String(bucketDate.getMonth() + 1).padStart(2, "0")}-${String(bucketDate.getDate()).padStart(2, "0")} ${String(bucketDate.getHours()).padStart(2, "0")}:00:00`;
      const values = bucketMap.get(t) ?? createEmpty();
      result.push(toResult(dateStr, values));
    }

    return result;
  }

  /**
   * Generic helper to aggregate daily data into multi-day buckets.
   */
  private aggregateDailyBuckets<T extends { date: string }, V, R>(
    data: T[],
    rangeStart: Date,
    rangeEnd: Date,
    bucketSizeDays: number,
    extractValues: (item: T) => V,
    createEmpty: () => V,
    accumulate: (acc: V, item: V) => V,
    toResult: (date: string, values: V) => R,
  ): R[] {
    const bucketMs = bucketSizeDays * 24 * 60 * 60 * 1000;

    // Create a map of raw daily data
    const dataMap = new Map(data.map(item => [item.date, item]));

    // Calculate bucket boundaries
    const startDay = new Date(rangeStart);
    startDay.setUTCHours(0, 0, 0, 0);
    const endDay = new Date(rangeEnd);
    endDay.setUTCHours(0, 0, 0, 0);

    // Aggregate into buckets
    const bucketMap = new Map<number, V>();

    for (let t = startDay.getTime(); t <= endDay.getTime(); t += 24 * 60 * 60 * 1000) {
      const dateStr = new Date(t).toISOString().split("T")[0];
      const existing = dataMap.get(dateStr);
      if (existing) {
        const bucketIndex = Math.floor((t - startDay.getTime()) / bucketMs);
        const bucketKey = startDay.getTime() + bucketIndex * bucketMs;
        const acc = bucketMap.get(bucketKey) ?? createEmpty();
        bucketMap.set(bucketKey, accumulate(acc, extractValues(existing)));
      }
    }

    // Fill in all buckets (including empty ones)
    const result: R[] = [];
    for (let t = startDay.getTime(); t <= endDay.getTime(); t += bucketMs) {
      const dateStr = new Date(t).toISOString().split("T")[0];
      const values = bucketMap.get(t) ?? createEmpty();
      result.push(toResult(dateStr, values));
    }

    return result;
  }

  /**
   * Get time-series data for run activity grouped by endpoint.
   *
   * @param userId - The user ID
   * @param filters - Filter options
   * @param filters.endpointLimit - Maximum number of endpoints to include (sorted by run count DESC)
   * @param filters.userId - User ID filter
   * @param filters.jobId - Job ID filter (optional)
   * @param filters.source - Scheduling source filter (optional)
   * @param filters.sinceDate - Start date for filtering runs
   * @param filters.untilDate - End date for filtering runs
   * @param filters.granularity - Time bucket granularity (hour or day)
   * @param filters.bucketSize - Size of each bucket (hours if granularity='hour', days if granularity='day')
   * @returns Array of time-series run counts by endpoint
   */
  private async getEndpointTimeSeries(
    userId: string,
    filters: {
      userId: string;
      jobId?: string;
      source?: string;
      sinceDate: Date;
      untilDate: Date;
      endpointLimit?: number;
      granularity: "hour" | "day";
      bucketSize: number;
    },
  ): Promise<EndpointTimeSeriesPoint[]> {
    // Get aggregated data from repository (SQL aggregation)
    const aggregatedData = await this.runsRepo.getEndpointTimeSeries(filters);

    const rangeStart = filters.sinceDate;
    const rangeEnd = filters.untilDate;

    // Get unique endpoints
    const endpoints = new Map<string, { id: string; name: string }>();
    aggregatedData.forEach((item) => {
      if (!endpoints.has(item.endpointId)) {
        endpoints.set(item.endpointId, { id: item.endpointId, name: item.endpointName });
      }
    });

    // If no endpoints, return empty array
    if (endpoints.size === 0) {
      return [];
    }

    if (filters.granularity === "hour") {
      return this.aggregateEndpointHourlyBuckets(
        aggregatedData,
        endpoints,
        rangeStart,
        rangeEnd,
        filters.bucketSize,
      );
    }

    // Daily granularity with variable bucket size
    return this.aggregateEndpointDailyBuckets(
      aggregatedData,
      endpoints,
      rangeStart,
      rangeEnd,
      filters.bucketSize,
    );
  }

  /**
   * Aggregate endpoint time-series into multi-hour buckets.
   */
  private aggregateEndpointHourlyBuckets(
    data: Array<{ date: string; endpointId: string; endpointName: string; success: number; failure: number; totalDurationMs: number }>,
    endpoints: Map<string, { id: string; name: string }>,
    rangeStart: Date,
    rangeEnd: Date,
    bucketSizeHours: number,
  ): EndpointTimeSeriesPoint[] {
    const bucketMs = bucketSizeHours * 60 * 60 * 1000;

    // Create a map of raw hourly data keyed by date-endpointId
    const dataMap = new Map(data.map(item => [`${item.date}-${item.endpointId}`, item]));

    // Calculate bucket boundaries
    const startHour = new Date(rangeStart);
    startHour.setMinutes(0, 0, 0);
    const endHour = new Date(rangeEnd);
    endHour.setMinutes(0, 0, 0);

    // Aggregate into buckets per endpoint
    const bucketMap = new Map<string, { success: number; failure: number; totalDurationMs: number }>();

    for (let t = startHour.getTime(); t <= endHour.getTime(); t += 60 * 60 * 1000) {
      const currentHour = new Date(t);
      const dateStr = `${currentHour.getFullYear()}-${String(currentHour.getMonth() + 1).padStart(2, "0")}-${String(currentHour.getDate()).padStart(2, "0")} ${String(currentHour.getHours()).padStart(2, "0")}:00:00`;

      endpoints.forEach((endpoint) => {
        const existing = dataMap.get(`${dateStr}-${endpoint.id}`);
        if (existing) {
          const bucketIndex = Math.floor((t - startHour.getTime()) / bucketMs);
          const bucketKey = `${startHour.getTime() + bucketIndex * bucketMs}-${endpoint.id}`;
          const acc = bucketMap.get(bucketKey) ?? { success: 0, failure: 0, totalDurationMs: 0 };
          acc.success += existing.success;
          acc.failure += existing.failure;
          acc.totalDurationMs += existing.totalDurationMs;
          bucketMap.set(bucketKey, acc);
        }
      });
    }

    // Fill in all buckets (including empty ones)
    const result: EndpointTimeSeriesPoint[] = [];
    for (let t = startHour.getTime(); t <= endHour.getTime(); t += bucketMs) {
      const bucketDate = new Date(t);
      const dateStr = `${bucketDate.getFullYear()}-${String(bucketDate.getMonth() + 1).padStart(2, "0")}-${String(bucketDate.getDate()).padStart(2, "0")} ${String(bucketDate.getHours()).padStart(2, "0")}:00:00`;

      endpoints.forEach((endpoint) => {
        const values = bucketMap.get(`${t}-${endpoint.id}`) ?? { success: 0, failure: 0, totalDurationMs: 0 };
        result.push({
          date: dateStr,
          endpointId: endpoint.id,
          endpointName: endpoint.name,
          ...values,
        });
      });
    }

    return result;
  }

  /**
   * Aggregate endpoint time-series into multi-day buckets.
   */
  private aggregateEndpointDailyBuckets(
    data: Array<{ date: string; endpointId: string; endpointName: string; success: number; failure: number; totalDurationMs: number }>,
    endpoints: Map<string, { id: string; name: string }>,
    rangeStart: Date,
    rangeEnd: Date,
    bucketSizeDays: number,
  ): EndpointTimeSeriesPoint[] {
    const bucketMs = bucketSizeDays * 24 * 60 * 60 * 1000;

    // Create a map of raw daily data keyed by date-endpointId
    const dataMap = new Map(data.map(item => [`${item.date}-${item.endpointId}`, item]));

    // Calculate bucket boundaries
    const startDay = new Date(rangeStart);
    startDay.setUTCHours(0, 0, 0, 0);
    const endDay = new Date(rangeEnd);
    endDay.setUTCHours(0, 0, 0, 0);

    // Aggregate into buckets per endpoint
    const bucketMap = new Map<string, { success: number; failure: number; totalDurationMs: number }>();

    for (let t = startDay.getTime(); t <= endDay.getTime(); t += 24 * 60 * 60 * 1000) {
      const dateStr = new Date(t).toISOString().split("T")[0];

      endpoints.forEach((endpoint) => {
        const existing = dataMap.get(`${dateStr}-${endpoint.id}`);
        if (existing) {
          const bucketIndex = Math.floor((t - startDay.getTime()) / bucketMs);
          const bucketKey = `${startDay.getTime() + bucketIndex * bucketMs}-${endpoint.id}`;
          const acc = bucketMap.get(bucketKey) ?? { success: 0, failure: 0, totalDurationMs: 0 };
          acc.success += existing.success;
          acc.failure += existing.failure;
          acc.totalDurationMs += existing.totalDurationMs;
          bucketMap.set(bucketKey, acc);
        }
      });
    }

    // Fill in all buckets (including empty ones)
    const result: EndpointTimeSeriesPoint[] = [];
    for (let t = startDay.getTime(); t <= endDay.getTime(); t += bucketMs) {
      const dateStr = new Date(t).toISOString().split("T")[0];

      endpoints.forEach((endpoint) => {
        const values = bucketMap.get(`${t}-${endpoint.id}`) ?? { success: 0, failure: 0, totalDurationMs: 0 };
        result.push({
          date: dateStr,
          endpointId: endpoint.id,
          endpointName: endpoint.name,
          ...values,
        });
      });
    }

    return result;
  }

  /**
   * Get time-series data for AI session activity.
   *
   * @param userId - The user ID
   * @param filters - Filter options
   * @param filters.userId - User ID filter
   * @param filters.jobId - Job ID filter (optional)
   * @param filters.sinceDate - Start date for filtering sessions
   * @param filters.untilDate - End date for filtering sessions
   * @param filters.endpointLimit - Maximum number of endpoints to include (sorted by session count DESC)
   * @param filters.granularity - Time bucket granularity (hour or day)
   * @param filters.bucketSize - Size of each bucket (hours if granularity='hour', days if granularity='day')
   * @returns Array of time-series AI session counts
   */
  private async getAISessionTimeSeries(
    userId: string,
    filters: {
      userId: string;
      jobId?: string;
      sinceDate: Date;
      untilDate: Date;
      endpointLimit?: number;
      granularity: "hour" | "day";
      bucketSize: number;
    },
  ): Promise<AISessionTimeSeriesPoint[]> {
    // Get aggregated data from repository (SQL aggregation by date + endpoint)
    const aggregatedData = await this.sessionsRepo.getAISessionTimeSeries(filters);

    const rangeStart = filters.sinceDate;
    const rangeEnd = filters.untilDate;

    // Get unique endpoints
    const endpoints = new Map<string, { id: string; name: string }>();
    aggregatedData.forEach((item) => {
      if (!endpoints.has(item.endpointId)) {
        endpoints.set(item.endpointId, {
          id: item.endpointId,
          name: item.endpointName,
        });
      }
    });

    // If no endpoints, return empty array
    if (endpoints.size === 0) {
      return [];
    }

    if (filters.granularity === "hour") {
      return this.aggregateAISessionHourlyBuckets(
        aggregatedData,
        endpoints,
        rangeStart,
        rangeEnd,
        filters.bucketSize,
      );
    }

    // Daily granularity with variable bucket size
    return this.aggregateAISessionDailyBuckets(
      aggregatedData,
      endpoints,
      rangeStart,
      rangeEnd,
      filters.bucketSize,
    );
  }

  /**
   * Aggregate AI session time-series into multi-hour buckets.
   */
  private aggregateAISessionHourlyBuckets(
    data: Array<{ date: string; endpointId: string; endpointName: string; sessionCount: number; totalTokens: number }>,
    endpoints: Map<string, { id: string; name: string }>,
    rangeStart: Date,
    rangeEnd: Date,
    bucketSizeHours: number,
  ): AISessionTimeSeriesPoint[] {
    const bucketMs = bucketSizeHours * 60 * 60 * 1000;

    // Create a map of raw hourly data keyed by date_endpointId
    const dataMap = new Map(data.map(item => [`${item.date}_${item.endpointId}`, item]));

    // Calculate bucket boundaries
    const startHour = new Date(rangeStart);
    startHour.setMinutes(0, 0, 0);
    const endHour = new Date(rangeEnd);
    endHour.setMinutes(0, 0, 0);

    // Aggregate into buckets per endpoint
    const bucketMap = new Map<string, { sessionCount: number; totalTokens: number }>();

    for (let t = startHour.getTime(); t <= endHour.getTime(); t += 60 * 60 * 1000) {
      const currentHour = new Date(t);
      const dateStr = `${currentHour.getFullYear()}-${String(currentHour.getMonth() + 1).padStart(2, "0")}-${String(currentHour.getDate()).padStart(2, "0")} ${String(currentHour.getHours()).padStart(2, "0")}:00:00`;

      endpoints.forEach((endpoint) => {
        const existing = dataMap.get(`${dateStr}_${endpoint.id}`);
        if (existing) {
          const bucketIndex = Math.floor((t - startHour.getTime()) / bucketMs);
          const bucketKey = `${startHour.getTime() + bucketIndex * bucketMs}_${endpoint.id}`;
          const acc = bucketMap.get(bucketKey) ?? { sessionCount: 0, totalTokens: 0 };
          acc.sessionCount += existing.sessionCount;
          acc.totalTokens += existing.totalTokens;
          bucketMap.set(bucketKey, acc);
        }
      });
    }

    // Fill in all buckets (including empty ones)
    const result: AISessionTimeSeriesPoint[] = [];
    for (let t = startHour.getTime(); t <= endHour.getTime(); t += bucketMs) {
      const bucketDate = new Date(t);
      const dateStr = `${bucketDate.getFullYear()}-${String(bucketDate.getMonth() + 1).padStart(2, "0")}-${String(bucketDate.getDate()).padStart(2, "0")} ${String(bucketDate.getHours()).padStart(2, "0")}:00:00`;

      endpoints.forEach((endpoint) => {
        const values = bucketMap.get(`${t}_${endpoint.id}`) ?? { sessionCount: 0, totalTokens: 0 };
        result.push({
          date: dateStr,
          endpointId: endpoint.id,
          endpointName: endpoint.name,
          ...values,
        });
      });
    }

    return result;
  }

  /**
   * Aggregate AI session time-series into multi-day buckets.
   */
  private aggregateAISessionDailyBuckets(
    data: Array<{ date: string; endpointId: string; endpointName: string; sessionCount: number; totalTokens: number }>,
    endpoints: Map<string, { id: string; name: string }>,
    rangeStart: Date,
    rangeEnd: Date,
    bucketSizeDays: number,
  ): AISessionTimeSeriesPoint[] {
    const bucketMs = bucketSizeDays * 24 * 60 * 60 * 1000;

    // Create a map of raw daily data keyed by date_endpointId
    const dataMap = new Map(data.map(item => [`${item.date}_${item.endpointId}`, item]));

    // Calculate bucket boundaries
    const startDay = new Date(rangeStart);
    startDay.setUTCHours(0, 0, 0, 0);
    const endDay = new Date(rangeEnd);
    endDay.setUTCHours(0, 0, 0, 0);

    // Aggregate into buckets per endpoint
    const bucketMap = new Map<string, { sessionCount: number; totalTokens: number }>();

    for (let t = startDay.getTime(); t <= endDay.getTime(); t += 24 * 60 * 60 * 1000) {
      const dateStr = new Date(t).toISOString().split("T")[0];

      endpoints.forEach((endpoint) => {
        const existing = dataMap.get(`${dateStr}_${endpoint.id}`);
        if (existing) {
          const bucketIndex = Math.floor((t - startDay.getTime()) / bucketMs);
          const bucketKey = `${startDay.getTime() + bucketIndex * bucketMs}_${endpoint.id}`;
          const acc = bucketMap.get(bucketKey) ?? { sessionCount: 0, totalTokens: 0 };
          acc.sessionCount += existing.sessionCount;
          acc.totalTokens += existing.totalTokens;
          bucketMap.set(bucketKey, acc);
        }
      });
    }

    // Fill in all buckets (including empty ones)
    const result: AISessionTimeSeriesPoint[] = [];
    for (let t = startDay.getTime(); t <= endDay.getTime(); t += bucketMs) {
      const dateStr = new Date(t).toISOString().split("T")[0];

      endpoints.forEach((endpoint) => {
        const values = bucketMap.get(`${t}_${endpoint.id}`) ?? { sessionCount: 0, totalTokens: 0 };
        result.push({
          date: dateStr,
          endpointId: endpoint.id,
          endpointName: endpoint.name,
          ...values,
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
      warnings: session.warnings.length > 0 ? session.warnings : undefined,
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
