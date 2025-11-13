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
    };

    // Mock SessionsRepo with all required methods
    mockSessionsRepo = {
      create: vi.fn(),
      getRecentSessions: vi.fn(),
      getTotalTokenUsage: vi.fn(),
      getAISessionTimeSeries: vi.fn().mockResolvedValue([]),
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
    it("should return complete dashboard stats with default 7 days", async () => {
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

      const result = await manager.getDashboardStats("user-1");

      expect(result.jobs.total).toBe(1);
      expect(result.endpoints.total).toBe(2);
      expect(result.endpoints.active).toBe(1);
      expect(result.endpoints.paused).toBe(1);
      expect(result.successRate.overall).toBeGreaterThan(0);
      expect(result.recentActivity.runs24h).toBe(2);
      expect(result.runTimeSeries).toHaveLength(7); // Default 7 days
    });

    it("should cap days parameter at 30", async () => {
      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 0, active: 0, paused: 0 });
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      const result = await manager.getDashboardStats("user-1", { days: 100 });

      // Should create 30 days of time series, not 100
      expect(result.runTimeSeries).toHaveLength(30);
    });

    it("should handle user with no jobs", async () => {
      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 0, active: 0, paused: 0 });
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      const result = await manager.getDashboardStats("user-1");

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

      const result = await manager.getDashboardStats("user-1", { days: 7 });

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

      const result = await manager.getDashboardStats("user-1", { days: 7 });

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

      const result = await manager.getDashboardStats("user-1", { days: 7 });

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

      const result = await manager.getDashboardStats("user-1", { days: 7 });

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

      const result = await manager.getDashboardStats("user-1", { days: 7 });

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

      const result = await manager.getDashboardStats("user-1");

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

      const result = await manager.getDashboardStats("user-1");

      expect(result.recentActivity.failure24h).toBe(1);
    });
  });

  // ==================== Run Time Series Tests ====================

  describe("runTimeSeries", () => {
    it("should create time series with all days initialized to zero", async () => {
      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 0, active: 0, paused: 0 });
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      const result = await manager.getDashboardStats("user-1", { days: 7 });

      expect(result.runTimeSeries).toHaveLength(7);
      result.runTimeSeries.forEach((point) => {
        expect(point.success).toBe(0);
        expect(point.failure).toBe(0);
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
      });
    });

    it("should aggregate runs by date", async () => {
      const today = baseDate.toISOString().split("T")[0];
      const yesterday = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 0, active: 0, paused: 0 });

      // Mock the aggregated time series data
      vi.mocked(mockRunsRepo.getRunTimeSeries).mockResolvedValue([
        { date: today, success: 1, failure: 1 },
        { date: yesterday, success: 1, failure: 0 },
      ]);

      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({
        runs: [
          {
            runId: "run-1",
            endpointId: "ep-1",
            startedAt: new Date(baseDate.getTime() - 1 * 60 * 60 * 1000), // Today
            status: "success",
            durationMs: 100,
          },
          {
            runId: "run-2",
            endpointId: "ep-1",
            startedAt: new Date(baseDate.getTime() - 2 * 60 * 60 * 1000), // Today
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

      const result = await manager.getDashboardStats("user-1", { days: 7 });

      const todayPoint = result.runTimeSeries.find(p => p.date === today);
      const yesterdayPoint = result.runTimeSeries.find(p => p.date === yesterday);

      expect(todayPoint?.success).toBe(1);
      expect(todayPoint?.failure).toBe(1);
      expect(yesterdayPoint?.success).toBe(1);
      expect(yesterdayPoint?.failure).toBe(0);
    });

    it("should sort time series chronologically", async () => {
      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpointCounts).mockResolvedValue({ total: 0, active: 0, paused: 0 });
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      const result = await manager.getDashboardStats("user-1", { days: 7 });

      // Verify dates are in ascending order
      for (let i = 1; i < result.runTimeSeries.length; i++) {
        expect(result.runTimeSeries[i].date > result.runTimeSeries[i - 1].date).toBe(true);
      }
    });
  });
});
