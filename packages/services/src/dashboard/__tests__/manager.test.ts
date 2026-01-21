import type { Clock, Job, JobEndpoint, JobsRepo, RunsRepo, SessionsRepo } from "@cronicorn/domain";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardManager } from "../manager.js";

/**
 * Unit tests for DashboardManager
 *
 * Tests dashboard statistics aggregation logic with mocked repos.
 * Focuses on data aggregation, trend calculations, and edge cases.
 */
describe("dashboardManager", () => {
  let manager: DashboardManager;
  let mockJobsRepo: JobsRepo;
  let mockRunsRepo: RunsRepo;
  let mockSessionsRepo: SessionsRepo;
  let fakeClock: Clock;
  let baseDate: Date;
  const DAY_MS = 24 * 60 * 60 * 1000;

  const dateRange = (days: number) => ({
    startDate: new Date(baseDate.getTime() - days * DAY_MS),
    endDate: baseDate,
  });

  beforeEach(() => {
    // Setup base date for consistent testing
    baseDate = new Date("2025-10-20T12:00:00Z");

    // Mock JobsRepo with all required methods
    mockJobsRepo = {
      getUserTier: vi.fn(),
      createJob: vi.fn(),
      getJob: vi.fn(),
      listJobs: vi.fn(),
      updateJob: vi.fn(),
      archiveJob: vi.fn(),
      pauseJob: vi.fn(),
      resumeJob: vi.fn(),
      addEndpoint: vi.fn(),
      updateEndpoint: vi.fn(),
      claimDueEndpoints: vi.fn(),
      getEndpoint: vi.fn(),
      setLock: vi.fn(),
      clearLock: vi.fn(),
      setNextRunAtIfEarlier: vi.fn(),
      writeAIHint: vi.fn(),
      setPausedUntil: vi.fn(),
      clearAIHints: vi.fn(),
      resetFailureCount: vi.fn(),
      updateAfterRun: vi.fn(),
      listEndpointsByJob: vi.fn(),
      deleteEndpoint: vi.fn(),
      archiveEndpoint: vi.fn(),
      countEndpointsByUser: vi.fn(),
      getEndpointCounts: vi.fn(),
      getUserById: vi.fn(),
      getUserByStripeCustomerId: vi.fn(),
      updateUserSubscription: vi.fn(),
      getUsage: vi.fn(),
    };

    // Mock RunsRepo with all required methods
    mockRunsRepo = {
      create: vi.fn(),
      finish: vi.fn(),
      listRuns: vi.fn(),
      getRunDetails: vi.fn(),
      getHealthSummary: vi.fn(),
      getHealthSummaryMultiWindow: vi.fn(),
      getEndpointsWithRecentRuns: vi.fn(),
      getLatestResponse: vi.fn(),
      getResponseHistory: vi.fn(),
      getSiblingLatestResponses: vi.fn(),
      cleanupZombieRuns: vi.fn(),
      getJobHealthDistribution: vi.fn().mockResolvedValue([]),
      getFilteredMetrics: vi.fn().mockResolvedValue({
        totalRuns: 0,
        successCount: 0,
        failureCount: 0,
        avgDurationMs: null,
      }),
      getSourceDistribution: vi.fn().mockResolvedValue([]),
      getRunTimeSeries: vi.fn().mockResolvedValue([]),
      getEndpointTimeSeries: vi.fn().mockResolvedValue([]),
      getJobRuns: vi.fn().mockResolvedValue({ runs: [], total: 0 }),
    };

    // Mock SessionsRepo with all required methods
    mockSessionsRepo = {
      getTotalSessionCount: vi.fn(),
      create: vi.fn(),
      getRecentSessions: vi.fn(),
      getTotalTokenUsage: vi.fn(),
      getAISessionTimeSeries: vi.fn().mockResolvedValue([]),
      getLastSession: vi.fn().mockResolvedValue(null),
      getJobSessions: vi.fn().mockResolvedValue({ sessions: [], total: 0 }),
      getSession: vi.fn().mockResolvedValue(null),
    };

    // Fake clock for deterministic time-based tests
    fakeClock = {
      now: () => baseDate,
      sleep: async () => { },
    };

    manager = new DashboardManager(mockJobsRepo, mockRunsRepo, mockSessionsRepo, fakeClock);
  });

  // ==================== getDashboardStats Tests ====================

  describe("getDashboardStats", () => {
    it("should return complete dashboard stats for a 7-day window", async () => {
      const mockJob: Job & { endpointCount: number } = {
        id: "job-1",
        userId: "user-1",
        name: "Test Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        endpointCount: 2,
      };

      const mockEndpoints: JobEndpoint[] = [
        {
          id: "ep-1",
          jobId: "job-1",
          tenantId: "user-1",
          name: "Endpoint 1",
          nextRunAt: new Date(),
          failureCount: 0,
        },
        {
          id: "ep-2",
          jobId: "job-1",
          tenantId: "user-1",
          name: "Endpoint 2",
          pausedUntil: new Date("2025-10-25T00:00:00Z"), // Paused in future
          nextRunAt: new Date(),
          failureCount: 0,
        },
      ];

      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([mockJob]);
      vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue(mockEndpoints);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({
        total: 2,
        active: 1,
        paused: 1,
      });
      vi.mocked(mockJobsRepo.getEndpoint).mockImplementation(async (id: string) => {
        const found = mockEndpoints.find(ep => ep.id === id);
        if (!found)
          throw new Error(`Endpoint ${id} not found`);
        return found;
      });
      vi.mocked(mockJobsRepo.getJob).mockImplementation(async (id: string) => {
        return id === "job-1" ? mockJob : null;
      });

      vi.mocked(mockRunsRepo.getFilteredMetrics).mockResolvedValue({
        totalRuns: 12,
        successCount: 10,
        failureCount: 2,
        avgDurationMs: 500,
      });

      vi.mocked(mockRunsRepo.getHealthSummary).mockResolvedValue({
        successCount: 10,
        failureCount: 2,
        avgDurationMs: 500,
        lastRun: { at: new Date("2025-10-20T11:00:00Z"), status: "success" },
        failureStreak: 0,
      });

      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({
        runs: [
          {
            runId: "run-1",
            endpointId: "ep-1",
            startedAt: new Date("2025-10-20T11:30:00Z"),
            status: "success",
            durationMs: 450,
          },
          {
            runId: "run-2",
            endpointId: "ep-2",
            startedAt: new Date("2025-10-20T10:00:00Z"),
            status: "failed",
            durationMs: 200,
          },
        ],
        total: 2,
      });

      const range = dateRange(7);

      const result = await manager.getDashboardStats("user-1", range);

      expect(result.jobs.total).toBe(1);
      expect(result.endpoints.total).toBe(2);
      expect(result.endpoints.active).toBe(1);
      expect(result.endpoints.paused).toBe(1);
      expect(result.successRate.overall).toBeGreaterThan(0);
      expect(result.recentActivity.runs24h).toBe(2);
      // 7-day range (<=14 days) uses hourly granularity with 6-hour buckets
      // 168 hours / 6 = 28, plus inclusive end = 29 buckets
      expect(result.runTimeSeries).toHaveLength(29);
      expect(mockRunsRepo.getFilteredMetrics).toHaveBeenCalledWith(expect.objectContaining({
        sinceDate: range.startDate,
        untilDate: range.endDate,
        granularity: "hour",
      }));
    });

    it("should use daily buckets for a 30-day window", async () => {
      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 0, active: 0, paused: 0 });
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      const result = await manager.getDashboardStats("user-1", dateRange(30));

      // 30 days (>14 days) uses daily granularity with 1-day buckets
      // From Sep 20 to Oct 20 inclusive = 31 buckets
      expect(result.runTimeSeries).toHaveLength(31);
    });

    it("should handle user with no jobs", async () => {
      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 0, active: 0, paused: 0 });
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      const result = await manager.getDashboardStats("user-1", dateRange(7));

      expect(result.jobs.total).toBe(0);
      expect(result.endpoints.total).toBe(0);
      expect(result.endpoints.active).toBe(0);
      expect(result.endpoints.paused).toBe(0);
      expect(result.successRate.overall).toBe(0);
      expect(result.successRate.trend).toBe("stable");
      expect(result.recentActivity.runs24h).toBe(0);
    });
  });

  // ==================== Success Rate & Trend Tests ====================

  describe("calculateOverallSuccessRate", () => {
    it("should calculate success rate with upward trend", async () => {
      const mockJob: Job & { endpointCount: number } = {
        id: "job-1",
        userId: "user-1",
        name: "Test Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        endpointCount: 1,
      };

      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        jobId: "job-1",
        tenantId: "user-1",
        name: "Endpoint 1",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([mockJob]);
      vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue([mockEndpoint]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 1, active: 1, paused: 0 });
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      // Current period: 90% success (9 success / 1 failure)
      // Previous period: 80% success (8 success / 2 failures)
      // Trend should be "up" (10% improvement > 2% threshold)
      vi.mocked(mockRunsRepo.getFilteredMetrics)
        .mockResolvedValueOnce({
          totalRuns: 10,
          successCount: 9,
          failureCount: 1,
          avgDurationMs: 500,
        })
        .mockResolvedValueOnce({
          totalRuns: 10,
          successCount: 8,
          failureCount: 2,
          avgDurationMs: 500,
        });

      vi.mocked(mockRunsRepo.getHealthSummary).mockResolvedValue({
        successCount: 50,
        failureCount: 5,
        avgDurationMs: 500,
        lastRun: { at: new Date(), status: "success" },
        failureStreak: 0,
      });

      const result = await manager.getDashboardStats("user-1", dateRange(7));

      expect(result.successRate.overall).toBe(90.0);
      expect(result.successRate.trend).toBe("up");
    });

    it("should calculate success rate with downward trend", async () => {
      const mockJob: Job & { endpointCount: number } = {
        id: "job-1",
        userId: "user-1",
        name: "Test Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        endpointCount: 1,
      };

      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        jobId: "job-1",
        tenantId: "user-1",
        name: "Endpoint 1",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([mockJob]);
      vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue([mockEndpoint]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 1, active: 1, paused: 0 });
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      // Current period: 70% success (7 success / 3 failures)
      // Previous period: 90% success (9 success / 1 failure)
      // Trend should be "down" (20% decline > 2% threshold)
      vi.mocked(mockRunsRepo.getFilteredMetrics)
        .mockResolvedValueOnce({
          totalRuns: 10,
          successCount: 7,
          failureCount: 3,
          avgDurationMs: 500,
        })
        .mockResolvedValueOnce({
          totalRuns: 10,
          successCount: 9,
          failureCount: 1,
          avgDurationMs: 500,
        });

      vi.mocked(mockRunsRepo.getHealthSummary)
        .mockResolvedValue({
          successCount: 7,
          failureCount: 3,
          avgDurationMs: 500,
          lastRun: null,
          failureStreak: 0,
        })
        .mockResolvedValueOnce({
          successCount: 9,
          failureCount: 1,
          avgDurationMs: 500,
          lastRun: null,
          failureStreak: 0,
        })
        // Also called by getTopEndpoints
        .mockResolvedValue({
          successCount: 50,
          failureCount: 5,
          avgDurationMs: 500,
          lastRun: { at: new Date(), status: "success" },
          failureStreak: 0,
        });

      const result = await manager.getDashboardStats("user-1", dateRange(7));

      expect(result.successRate.overall).toBe(70.0);
      expect(result.successRate.trend).toBe("down");
    });

    it("should show stable trend for small changes", async () => {
      const mockJob: Job & { endpointCount: number } = {
        id: "job-1",
        userId: "user-1",
        name: "Test Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        endpointCount: 1,
      };

      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        jobId: "job-1",
        tenantId: "user-1",
        name: "Endpoint 1",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([mockJob]);
      vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue([mockEndpoint]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 1, active: 1, paused: 0 });
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      // Current: 90%, Previous: 91% (1% change < 2% threshold)
      vi.mocked(mockRunsRepo.getHealthSummary)
        .mockResolvedValueOnce({
          successCount: 9,
          failureCount: 1,
          avgDurationMs: 500,
          lastRun: null,
          failureStreak: 0,
        })
        .mockResolvedValueOnce({
          successCount: 91,
          failureCount: 9,
          avgDurationMs: 500,
          lastRun: null,
          failureStreak: 0,
        })
        // Also called by getTopEndpoints
        .mockResolvedValue({
          successCount: 50,
          failureCount: 5,
          avgDurationMs: 500,
          lastRun: { at: new Date(), status: "success" },
          failureStreak: 0,
        });

      const result = await manager.getDashboardStats("user-1", dateRange(7));

      expect(result.successRate.trend).toBe("stable");
    });

    it("should handle zero runs gracefully", async () => {
      const mockJob: Job & { endpointCount: number } = {
        id: "job-1",
        userId: "user-1",
        name: "Test Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        endpointCount: 1,
      };

      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        jobId: "job-1",
        tenantId: "user-1",
        name: "Endpoint 1",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([mockJob]);
      vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue([mockEndpoint]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 1, active: 1, paused: 0 });
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });
      vi.mocked(mockRunsRepo.getHealthSummary).mockResolvedValue({
        successCount: 0,
        failureCount: 0,
        avgDurationMs: 0,
        lastRun: null,
        failureStreak: 0,
      });

      const result = await manager.getDashboardStats("user-1", dateRange(7));

      expect(result.successRate.overall).toBe(0);
      expect(result.successRate.trend).toBe("stable");
    });

    it("should handle all failures", async () => {
      const mockJob: Job & { endpointCount: number } = {
        id: "job-1",
        userId: "user-1",
        name: "Test Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        endpointCount: 1,
      };

      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        jobId: "job-1",
        tenantId: "user-1",
        name: "Endpoint 1",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([mockJob]);
      vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue([mockEndpoint]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 1, active: 1, paused: 0 });
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });
      vi.mocked(mockRunsRepo.getHealthSummary).mockResolvedValue({
        successCount: 0,
        failureCount: 10,
        avgDurationMs: 500,
        lastRun: { at: new Date(), status: "failed" },
        failureStreak: 10,
      });

      const result = await manager.getDashboardStats("user-1", dateRange(7));

      expect(result.successRate.overall).toBe(0);
    });
  });

  // ==================== Recent Activity Tests ====================

  describe("recentActivity", () => {
    it("should count runs in last 24 hours", async () => {
      const now = baseDate;
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 0, active: 0, paused: 0 });
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({
        runs: [
          {
            runId: "run-1",
            endpointId: "ep-1",
            startedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
            status: "success",
            durationMs: 100,
          },
          {
            runId: "run-2",
            endpointId: "ep-1",
            startedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
            status: "failed",
            durationMs: 200,
          },
          {
            runId: "run-3",
            endpointId: "ep-1",
            startedAt: new Date(now.getTime() - 23 * 60 * 60 * 1000), // 23 hours ago
            status: "success",
            durationMs: 150,
          },
          {
            runId: "run-4",
            endpointId: "ep-1",
            startedAt: twoDaysAgo, // 2 days ago (should not count)
            status: "success",
            durationMs: 100,
          },
        ],
        total: 4,
      });

      const result = await manager.getDashboardStats("user-1", dateRange(7));

      expect(result.recentActivity.runs24h).toBe(3);
      expect(result.recentActivity.success24h).toBe(2);
      expect(result.recentActivity.failure24h).toBe(1);
    });

    it("should count timeout as failure", async () => {
      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 0, active: 0, paused: 0 });
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({
        runs: [
          {
            runId: "run-1",
            endpointId: "ep-1",
            startedAt: new Date(baseDate.getTime() - 1 * 60 * 60 * 1000),
            status: "timeout",
            durationMs: 30000,
          },
        ],
        total: 1,
      });

      const result = await manager.getDashboardStats("user-1", dateRange(7));

      expect(result.recentActivity.failure24h).toBe(1);
    });
  });

  // ==================== Run Time Series Tests ====================

  describe("runTimeSeries", () => {
    it("should create time series with all buckets initialized to zero", async () => {
      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 0, active: 0, paused: 0 });
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      const result = await manager.getDashboardStats("user-1", dateRange(7));

      // 7-day range uses hourly granularity with 6-hour buckets (29 buckets)
      expect(result.runTimeSeries).toHaveLength(29);
      result.runTimeSeries.forEach((point) => {
        expect(point.success).toBe(0);
        expect(point.failure).toBe(0);
        // Hourly format: YYYY-MM-DD HH:00:00
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:00:00$/);
      });
    });

    it("should aggregate runs by date", async () => {
      // 7-day range uses hourly format with 6-hour buckets: YYYY-MM-DD HH:00:00
      const formatHour = (date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00:00`;
      };

      const currentHourStart = new Date(baseDate);
      currentHourStart.setMinutes(0, 0, 0);
      const currentHour = formatHour(currentHourStart);

      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 0, active: 0, paused: 0 });

      // Mock the aggregated time series data with hourly format
      // Note: With 6-hour buckets, hours within the same bucket get aggregated together
      vi.mocked(mockRunsRepo.getRunTimeSeries).mockResolvedValue([
        { date: currentHour, success: 2, failure: 1 }, // Aggregated data from current bucket
      ]);

      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({
        runs: [
          {
            runId: "run-1",
            endpointId: "ep-1",
            startedAt: new Date(baseDate.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
            status: "success",
            durationMs: 100,
          },
          {
            runId: "run-2",
            endpointId: "ep-1",
            startedAt: new Date(baseDate.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
            status: "failed",
            durationMs: 200,
          },
          {
            runId: "run-3",
            endpointId: "ep-1",
            startedAt: new Date(baseDate.getTime() - 25 * 60 * 60 * 1000), // Yesterday
            status: "success",
            durationMs: 150,
          },
        ],
        total: 3,
      });

      const result = await manager.getDashboardStats("user-1", dateRange(7));

      // Find the current bucket and verify aggregated data
      const currentBucket = result.runTimeSeries.find(p => p.date === currentHour);

      expect(currentBucket?.success).toBe(2);
      expect(currentBucket?.failure).toBe(1);
    });

    it("should sort time series chronologically", async () => {
      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 0, active: 0, paused: 0 });
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      const result = await manager.getDashboardStats("user-1", dateRange(7));

      // Verify dates are in ascending order
      for (let i = 1; i < result.runTimeSeries.length; i++) {
        expect(result.runTimeSeries[i].date > result.runTimeSeries[i - 1].date).toBe(true);
      }
    });
  });

  // ==================== Hourly Bucketing Tests ====================

  describe("hourly time series buckets", () => {
    it("should use hourly granularity for a 24h window", async () => {
      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 0, active: 0, paused: 0 });
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      const range = dateRange(1);
      const result = await manager.getDashboardStats("user-1", range);

      // Should create 25 hourly buckets (24 hours + inclusive end)
      expect(result.runTimeSeries).toHaveLength(25);
      expect(mockRunsRepo.getRunTimeSeries).toHaveBeenCalledWith(expect.objectContaining({
        sinceDate: range.startDate,
        untilDate: range.endDate,
        granularity: "hour",
      }));

      // Verify hourly format (YYYY-MM-DD HH:00:00)
      result.runTimeSeries.forEach((point) => {
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:00:00$/);
      });
    });

    it("should align hourly buckets to hour boundaries", async () => {
      // Clock time: 2025-10-20T12:00:00Z (base date)
      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 0, active: 0, paused: 0 });
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      const result = await manager.getDashboardStats("user-1", dateRange(1));

      // Should have 25 buckets (24 hours + inclusive end)
      expect(result.runTimeSeries).toHaveLength(25);

      // Last bucket should be the current hour boundary
      const lastBucket = result.runTimeSeries[result.runTimeSeries.length - 1];
      expect(lastBucket.date).toMatch(/:00:00$/);

      // First bucket should be 24 hours earlier (also at :00:00)
      const firstBucket = result.runTimeSeries[0];
      expect(firstBucket.date).toMatch(/:00:00$/);
    });

    it("should use hourly granularity with 6-hour buckets for a 7-day window", async () => {
      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 0, active: 0, paused: 0 });
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      const range = dateRange(7);
      const result = await manager.getDashboardStats("user-1", range);

      // 7-day range (<=14 days) uses hourly granularity with 6-hour buckets
      // 168 hours / 6 = 28 + 1 inclusive = 29 buckets
      expect(result.runTimeSeries).toHaveLength(29);
      expect(mockRunsRepo.getRunTimeSeries).toHaveBeenCalledWith(expect.objectContaining({
        granularity: "hour",
        sinceDate: range.startDate,
        untilDate: range.endDate,
      }));

      // Verify hourly format (YYYY-MM-DD HH:00:00)
      result.runTimeSeries.forEach((point) => {
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:00:00$/);
      });
    });

    it("should use daily buckets for a 30-day window", async () => {
      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 0, active: 0, paused: 0 });
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      const result = await manager.getDashboardStats("user-1", dateRange(30));

      // 30-day range (>14 days) uses daily granularity with 1-day buckets
      // From Sep 20 to Oct 20 inclusive = 31 buckets
      expect(result.runTimeSeries).toHaveLength(31);

      // Verify daily format (YYYY-MM-DD)
      result.runTimeSeries.forEach((point) => {
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it("should aggregate hourly data from repository correctly", async () => {
      const now = baseDate; // 2025-10-20T12:00:00Z

      // Format hour strings using the same logic as the manager
      const formatHour = (date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00:00`;
      };

      const currentHourStart = new Date(now);
      currentHourStart.setMinutes(0, 0, 0);

      const currentHour = formatHour(currentHourStart);
      const oneHourAgo = formatHour(new Date(currentHourStart.getTime() - 60 * 60 * 1000));
      const twoHoursAgo = formatHour(new Date(currentHourStart.getTime() - 2 * 60 * 60 * 1000));

      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 0, active: 0, paused: 0 });

      // Mock hourly aggregated data
      vi.mocked(mockRunsRepo.getRunTimeSeries).mockResolvedValue([
        { date: currentHour, success: 5, failure: 1 },
        { date: oneHourAgo, success: 3, failure: 2 },
        { date: twoHoursAgo, success: 4, failure: 0 },
      ]);

      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      const range = dateRange(1);
      const result = await manager.getDashboardStats("user-1", range);

      // Find the specific hours
      const currentHourPoint = result.runTimeSeries.find(p => p.date === currentHour);
      const oneHourAgoPoint = result.runTimeSeries.find(p => p.date === oneHourAgo);
      const twoHoursAgoPoint = result.runTimeSeries.find(p => p.date === twoHoursAgo);

      expect(currentHourPoint).toEqual({ date: currentHour, success: 5, failure: 1 });
      expect(oneHourAgoPoint).toEqual({ date: oneHourAgo, success: 3, failure: 2 });
      expect(twoHoursAgoPoint).toEqual({ date: twoHoursAgo, success: 4, failure: 0 });

      // Verify other hours are zero-filled
      const threeHoursAgo = formatHour(new Date(currentHourStart.getTime() - 3 * 60 * 60 * 1000));
      const threeHoursAgoPoint = result.runTimeSeries.find(p => p.date === threeHoursAgo);
      expect(threeHoursAgoPoint).toEqual({ date: threeHoursAgo, success: 0, failure: 0 });
    });

    it("should handle endpoint time series with hourly buckets", async () => {
      const now = baseDate;
      const formatHour = (date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00:00`;
      };

      const currentHourStart = new Date(now);
      currentHourStart.setMinutes(0, 0, 0);
      const currentHour = formatHour(currentHourStart);

      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 0, active: 0, paused: 0 });

      // Mock endpoint time series with 2 endpoints
      vi.mocked(mockRunsRepo.getEndpointTimeSeries).mockResolvedValue([
        {
          date: currentHour,
          endpointId: "ep-1",
          endpointName: "Endpoint 1",
          success: 5,
          failure: 1,
          totalDurationMs: 1500,
        },
        {
          date: currentHour,
          endpointId: "ep-2",
          endpointName: "Endpoint 2",
          success: 3,
          failure: 0,
          totalDurationMs: 900,
        },
      ]);

      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      const result = await manager.getDashboardStats("user-1", dateRange(1));

      // Should have 25 hours (inclusive) * 2 endpoints = 50 data points
      expect(result.endpointTimeSeries).toHaveLength(50);

      // Verify data for current hour
      const ep1CurrentHour = result.endpointTimeSeries.find(
        p => p.date === currentHour && p.endpointId === "ep-1",
      );
      const ep2CurrentHour = result.endpointTimeSeries.find(
        p => p.date === currentHour && p.endpointId === "ep-2",
      );

      expect(ep1CurrentHour).toEqual({
        date: currentHour,
        endpointId: "ep-1",
        endpointName: "Endpoint 1",
        success: 5,
        failure: 1,
        totalDurationMs: 1500,
      });
      expect(ep2CurrentHour).toEqual({
        date: currentHour,
        endpointId: "ep-2",
        endpointName: "Endpoint 2",
        success: 3,
        failure: 0,
        totalDurationMs: 900,
      });
    });

    it("should handle AI session time series with hourly buckets", async () => {
      const now = baseDate;
      const formatHour = (date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00:00`;
      };

      const currentHourStart = new Date(now);
      currentHourStart.setMinutes(0, 0, 0);
      const currentHour = formatHour(currentHourStart);
      const oneHourAgo = formatHour(new Date(currentHourStart.getTime() - 60 * 60 * 1000));

      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 0, active: 0, paused: 0 });

      // Mock AI session time series
      vi.mocked(mockSessionsRepo.getAISessionTimeSeries).mockResolvedValue([
        {
          date: currentHour,
          endpointId: "ep-1",
          endpointName: "Endpoint 1",
          sessionCount: 2,
          totalTokens: 1500,
        },
      ]);

      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      const result = await manager.getDashboardStats("user-1", dateRange(1));

      // Should have hourly buckets
      const currentHourSession = result.aiSessionTimeSeries.find(
        p => p.date === currentHour,
      );

      expect(currentHourSession).toEqual({
        date: currentHour,
        endpointId: "ep-1",
        endpointName: "Endpoint 1",
        sessionCount: 2,
        totalTokens: 1500,
      });

      // Verify zero-filled hours
      const oneHourAgoSession = result.aiSessionTimeSeries.find(
        p => p.date === oneHourAgo,
      );
      expect(oneHourAgoSession?.sessionCount).toBe(0);
      expect(oneHourAgoSession?.totalTokens).toBe(0);
    });
  });

  describe("getJobActivityTimeline", () => {
    const mockRuns = [
      {
        runId: "run-1",
        endpointId: "ep-1",
        endpointName: "Endpoint 1",
        startedAt: new Date("2025-10-20T10:00:00Z"),
        status: "success" as const,
        durationMs: 150,
        source: "cron",
      },
      {
        runId: "run-2",
        endpointId: "ep-1",
        endpointName: "Endpoint 1",
        startedAt: new Date("2025-10-20T09:00:00Z"),
        status: "failed" as const,
        durationMs: 200,
        source: "manual",
      },
    ];

    const mockSessions = [
      {
        sessionId: "session-1",
        endpointId: "ep-1",
        endpointName: "Endpoint 1",
        analyzedAt: new Date("2025-10-20T10:30:00Z"),
        reasoning: "Analyzed recent failures",
        toolCalls: [
          { tool: "analyze", args: {}, result: {} },
          { tool: "suggest", args: {}, result: {} },
        ],
        tokenUsage: 500,
        durationMs: 1500,
      },
      {
        sessionId: "session-2",
        endpointId: "ep-1",
        endpointName: "Endpoint 1",
        analyzedAt: new Date("2025-10-20T08:00:00Z"),
        reasoning: "Initial analysis",
        toolCalls: [{ tool: "analyze", args: {}, result: {} }],
        tokenUsage: 300,
        durationMs: 800,
      },
    ];

    it("should fetch both runs and sessions when eventType is 'all'", async () => {
      vi.mocked(mockRunsRepo.getJobRuns).mockResolvedValue({ runs: mockRuns, total: 2 });
      vi.mocked(mockSessionsRepo.getJobSessions).mockResolvedValue({ sessions: mockSessions, total: 2 });

      const result = await manager.getJobActivityTimeline("user-1", undefined, {
        startDate: new Date("2025-10-19T00:00:00Z"),
        endDate: new Date("2025-10-20T23:59:59Z"),
        eventType: "all",
      });

      expect(mockRunsRepo.getJobRuns).toHaveBeenCalled();
      expect(mockSessionsRepo.getJobSessions).toHaveBeenCalled();
      expect(result.events).toHaveLength(4);
      expect(result.total).toBe(4);
    });

    it("should only fetch runs when eventType is 'runs'", async () => {
      vi.mocked(mockRunsRepo.getJobRuns).mockResolvedValue({ runs: mockRuns, total: 2 });

      const result = await manager.getJobActivityTimeline("user-1", undefined, {
        startDate: new Date("2025-10-19T00:00:00Z"),
        endDate: new Date("2025-10-20T23:59:59Z"),
        eventType: "runs",
      });

      expect(mockRunsRepo.getJobRuns).toHaveBeenCalled();
      expect(mockSessionsRepo.getJobSessions).not.toHaveBeenCalled();
      expect(result.events).toHaveLength(2);
      expect(result.events.every(e => e.type === "run")).toBe(true);
      expect(result.total).toBe(2);
    });

    it("should only fetch sessions when eventType is 'sessions'", async () => {
      vi.mocked(mockSessionsRepo.getJobSessions).mockResolvedValue({ sessions: mockSessions, total: 2 });

      const result = await manager.getJobActivityTimeline("user-1", undefined, {
        startDate: new Date("2025-10-19T00:00:00Z"),
        endDate: new Date("2025-10-20T23:59:59Z"),
        eventType: "sessions",
      });

      expect(mockRunsRepo.getJobRuns).not.toHaveBeenCalled();
      expect(mockSessionsRepo.getJobSessions).toHaveBeenCalled();
      expect(result.events).toHaveLength(2);
      expect(result.events.every(e => e.type === "session")).toBe(true);
      expect(result.total).toBe(2);
    });

    it("should default to 'all' when eventType is not specified", async () => {
      vi.mocked(mockRunsRepo.getJobRuns).mockResolvedValue({ runs: mockRuns, total: 2 });
      vi.mocked(mockSessionsRepo.getJobSessions).mockResolvedValue({ sessions: mockSessions, total: 2 });

      const result = await manager.getJobActivityTimeline("user-1", undefined, {
        startDate: new Date("2025-10-19T00:00:00Z"),
        endDate: new Date("2025-10-20T23:59:59Z"),
      });

      expect(mockRunsRepo.getJobRuns).toHaveBeenCalled();
      expect(mockSessionsRepo.getJobSessions).toHaveBeenCalled();
      expect(result.events).toHaveLength(4);
    });

    it("should sort events by timestamp descending", async () => {
      vi.mocked(mockRunsRepo.getJobRuns).mockResolvedValue({ runs: mockRuns, total: 2 });
      vi.mocked(mockSessionsRepo.getJobSessions).mockResolvedValue({ sessions: mockSessions, total: 2 });

      const result = await manager.getJobActivityTimeline("user-1", undefined, {
        startDate: new Date("2025-10-19T00:00:00Z"),
        endDate: new Date("2025-10-20T23:59:59Z"),
        eventType: "all",
      });

      // Events should be sorted descending by timestamp
      const timestamps = result.events.map(e => e.timestamp.getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i - 1]);
      }
    });
  });
});
