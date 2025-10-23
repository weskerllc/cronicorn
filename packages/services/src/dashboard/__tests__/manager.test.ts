import type { Clock, Job, JobEndpoint, JobsRepo, RunsRepo } from "@cronicorn/domain";

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
    };

    // Fake clock for deterministic time-based tests
    fakeClock = {
      now: () => baseDate,
      sleep: async () => { },
    };

    manager = new DashboardManager(mockJobsRepo, mockRunsRepo, fakeClock);
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
      vi.mocked(mockJobsRepo.getEndpoint).mockImplementation(async (id: string) => {
        const found = mockEndpoints.find(ep => ep.id === id);
        if (!found)
          throw new Error(`Endpoint ${id} not found`);
        return found;
      });
      vi.mocked(mockJobsRepo.getJob).mockImplementation(async (id: string) => {
        return id === "job-1" ? mockJob : null;
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
      expect(result.topEndpoints.length).toBeGreaterThanOrEqual(0);
      expect(result.recentRuns.length).toBeGreaterThanOrEqual(0);
    });

    it("should cap days parameter at 30", async () => {
      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      const result = await manager.getDashboardStats("user-1", { days: 100 });

      // Should create 30 days of time series, not 100
      expect(result.runTimeSeries).toHaveLength(30);
    });

    it("should handle user with no jobs", async () => {
      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      const result = await manager.getDashboardStats("user-1");

      expect(result.jobs.total).toBe(0);
      expect(result.endpoints.total).toBe(0);
      expect(result.endpoints.active).toBe(0);
      expect(result.endpoints.paused).toBe(0);
      expect(result.successRate.overall).toBe(0);
      expect(result.successRate.trend).toBe("stable");
      expect(result.recentActivity.runs24h).toBe(0);
      expect(result.topEndpoints).toEqual([]);
      expect(result.recentRuns).toEqual([]);
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
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      // Current period: 90% success (9 success / 1 failure)
      // Previous period: 80% success (8 success / 2 failures)
      // Trend should be "up" (10% improvement > 2% threshold)
      vi.mocked(mockRunsRepo.getHealthSummary)
        .mockResolvedValueOnce({
          successCount: 9,
          failureCount: 1,
          avgDurationMs: 500,
          lastRun: null,
          failureStreak: 0,
        })
        .mockResolvedValueOnce({
          successCount: 8,
          failureCount: 2,
          avgDurationMs: 500,
          lastRun: null,
          failureStreak: 0,
        })
      // Also called by getTopEndpoints (for last 30 days)
        .mockResolvedValue({
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
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      // Current period: 70% success (7 success / 3 failures)
      // Previous period: 90% success (9 success / 1 failure)
      // Trend should be "down" (20% decline > 2% threshold)
      vi.mocked(mockRunsRepo.getHealthSummary)
        .mockResolvedValueOnce({
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
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      const result = await manager.getDashboardStats("user-1", { days: 7 });

      // Verify dates are in ascending order
      for (let i = 1; i < result.runTimeSeries.length; i++) {
        expect(result.runTimeSeries[i].date > result.runTimeSeries[i - 1].date).toBe(true);
      }
    });
  });

  // ==================== Top Endpoints Tests ====================

  describe("topEndpoints", () => {
    it("should rank endpoints by run count", async () => {
      const mockJob: Job & { endpointCount: number } = {
        id: "job-1",
        userId: "user-1",
        name: "Test Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        endpointCount: 3,
      };

      const mockEndpoints: JobEndpoint[] = [
        { id: "ep-1", jobId: "job-1", tenantId: "user-1", name: "High Volume", nextRunAt: new Date(), failureCount: 0 },
        { id: "ep-2", jobId: "job-1", tenantId: "user-1", name: "Medium Volume", nextRunAt: new Date(), failureCount: 0 },
        { id: "ep-3", jobId: "job-1", tenantId: "user-1", name: "Low Volume", nextRunAt: new Date(), failureCount: 0 },
      ];

      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([mockJob]);
      vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue(mockEndpoints);
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      // ep-1: 100 runs, ep-2: 50 runs, ep-3: 10 runs
      vi.mocked(mockRunsRepo.getHealthSummary)
        .mockResolvedValueOnce({
          successCount: 95,
          failureCount: 5,
          avgDurationMs: 500,
          lastRun: { at: new Date(), status: "success" },
          failureStreak: 0,
        })
        .mockResolvedValueOnce({
          successCount: 45,
          failureCount: 5,
          avgDurationMs: 500,
          lastRun: { at: new Date(), status: "success" },
          failureStreak: 0,
        })
        .mockResolvedValueOnce({
          successCount: 8,
          failureCount: 2,
          avgDurationMs: 500,
          lastRun: { at: new Date(), status: "success" },
          failureStreak: 0,
        })
      // For calculateOverallSuccessRate - current period (3 endpoints)
        .mockResolvedValueOnce({
          successCount: 10,
          failureCount: 2,
          avgDurationMs: 500,
          lastRun: { at: new Date(), status: "success" },
          failureStreak: 0,
        })
        .mockResolvedValueOnce({
          successCount: 8,
          failureCount: 2,
          avgDurationMs: 500,
          lastRun: { at: new Date(), status: "success" },
          failureStreak: 0,
        })
        .mockResolvedValueOnce({
          successCount: 6,
          failureCount: 2,
          avgDurationMs: 500,
          lastRun: { at: new Date(), status: "success" },
          failureStreak: 0,
        })
      // For calculateOverallSuccessRate - previous period (3 endpoints)
        .mockResolvedValueOnce({
          successCount: 10,
          failureCount: 2,
          avgDurationMs: 500,
          lastRun: { at: new Date(), status: "success" },
          failureStreak: 0,
        })
        .mockResolvedValueOnce({
          successCount: 8,
          failureCount: 2,
          avgDurationMs: 500,
          lastRun: { at: new Date(), status: "success" },
          failureStreak: 0,
        })
        .mockResolvedValueOnce({
          successCount: 6,
          failureCount: 2,
          avgDurationMs: 500,
          lastRun: { at: new Date(), status: "success" },
          failureStreak: 0,
        });

      const result = await manager.getDashboardStats("user-1");

      expect(result.topEndpoints).toHaveLength(3);
      // Verify endpoints are ranked by run count (descending)
      expect(result.topEndpoints[0].name).toBe("High Volume");
      expect(result.topEndpoints[0].runCount).toBeGreaterThan(result.topEndpoints[1].runCount);
      expect(result.topEndpoints[1].name).toBe("Medium Volume");
      expect(result.topEndpoints[1].runCount).toBeGreaterThan(result.topEndpoints[2].runCount);
      expect(result.topEndpoints[2].name).toBe("Low Volume");
    });

    it("should limit to top 5 endpoints", async () => {
      const mockJob: Job & { endpointCount: number } = {
        id: "job-1",
        userId: "user-1",
        name: "Test Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        endpointCount: 10,
      };

      // Create 10 endpoints
      const mockEndpoints: JobEndpoint[] = Array.from({ length: 10 }, (_, i) => ({
        id: `ep-${i}`,
        jobId: "job-1",
        tenantId: "user-1",
        name: `Endpoint ${i}`,
        nextRunAt: new Date(),
        failureCount: 0,
      }));

      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([mockJob]);
      vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue(mockEndpoints);
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      // Mock health summaries with varying run counts
      vi.mocked(mockRunsRepo.getHealthSummary).mockImplementation(async () => ({
        successCount: Math.floor(Math.random() * 100),
        failureCount: Math.floor(Math.random() * 10),
        avgDurationMs: 500,
        lastRun: { at: new Date(), status: "success" },
        failureStreak: 0,
      }));

      const result = await manager.getDashboardStats("user-1");

      expect(result.topEndpoints).toHaveLength(5);
    });

    it("should calculate success rate correctly", async () => {
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
        name: "Test Endpoint",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([mockJob]);
      vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue([mockEndpoint]);
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({ runs: [], total: 0 });

      // 8 success / 2 failures = 80% success rate
      vi.mocked(mockRunsRepo.getHealthSummary).mockResolvedValue({
        successCount: 8,
        failureCount: 2,
        avgDurationMs: 500,
        lastRun: { at: new Date(), status: "success" },
        failureStreak: 0,
      });

      const result = await manager.getDashboardStats("user-1");

      expect(result.topEndpoints[0].successRate).toBe(80.0);
    });
  });

  // ==================== Recent Runs Tests ====================

  describe("recentRunsGlobal", () => {
    it("should enrich runs with endpoint and job names", async () => {
      const mockJob: Job = {
        id: "job-1",
        userId: "user-1",
        name: "Production API",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        jobId: "job-1",
        tenantId: "user-1",
        name: "Health Check",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);

      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({
        runs: [
          {
            runId: "run-1",
            endpointId: "ep-1",
            startedAt: new Date("2025-10-20T11:30:00Z"),
            status: "success",
            durationMs: 450,
            source: "baseline-cron",
          },
        ],
        total: 1,
      });

      const result = await manager.getDashboardStats("user-1");

      expect(result.recentRuns).toHaveLength(1);
      expect(result.recentRuns[0].endpointName).toBe("Health Check");
      expect(result.recentRuns[0].jobName).toBe("Production API");
      expect(result.recentRuns[0].source).toBe("baseline-cron");
    });

    it("should handle missing job gracefully", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-deleted",
        jobId: "job-unknown",
        tenantId: "user-1",
        name: "Deleted Endpoint",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(null);

      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({
        runs: [
          {
            runId: "run-1",
            endpointId: "ep-deleted",
            startedAt: new Date(),
            status: "success",
            durationMs: 100,
          },
        ],
        total: 1,
      });

      const result = await manager.getDashboardStats("user-1");

      // Endpoint name is preserved, but job is "Unknown Job" when job lookup fails
      expect(result.recentRuns[0].endpointName).toBe("Deleted Endpoint");
      expect(result.recentRuns[0].jobName).toBe("Unknown Job");
    });

    it("should limit to 50 recent runs", async () => {
      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue([]);

      // Create exactly 50 runs (the limit we pass to listRuns)
      const fiftyRuns = Array.from({ length: 50 }, (_, i) => ({
        runId: `run-${i}`,
        endpointId: "ep-1",
        startedAt: new Date(baseDate.getTime() - i * 60 * 1000),
        status: "success" as const,
        durationMs: 100,
      }));

      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue({
        runs: fiftyRuns,
        total: 100, // Total could be higher, but we only return 50
      });

      const result = await manager.getDashboardStats("user-1");

      // Verify the manager requested 50 runs
      expect(mockRunsRepo.listRuns).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1", limit: 50 }),
      );
      // Result should have exactly the runs returned by the mock
      expect(result.recentRuns.length).toBe(50);
    });
  });
});
