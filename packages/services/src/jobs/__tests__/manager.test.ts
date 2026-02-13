import type { Clock, Cron, Job, JobEndpoint, JobsRepo, RunsRepo, SessionsRepo } from "@cronicorn/domain";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AddEndpointInput } from "../manager.js";

import { JobsManager } from "../manager.js";

/**
 * Test suite for JobsManager covering all 17 public actions.
 */
describe("jobsManager", () => {
  let mockJobsRepo: JobsRepo;
  let mockRunsRepo: RunsRepo;
  let mockSessionsRepo: SessionsRepo;
  let fakeClock: Clock;
  let fakeCron: Cron;
  let manager: JobsManager;

  beforeEach(() => {
    // Setup mock repositories with all required methods
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
    mockSessionsRepo = {
      create: vi.fn(),
      getRecentSessions: vi.fn().mockResolvedValue([]),
      getTotalSessionCount: vi.fn().mockResolvedValue(0),
      getTotalTokenUsage: vi.fn().mockResolvedValue(0),
      getAISessionTimeSeries: vi.fn().mockResolvedValue([]),
      getLastSession: vi.fn().mockResolvedValue(null),
      getJobSessions: vi.fn().mockResolvedValue({ sessions: [], total: 0 }),
      getSession: vi.fn().mockResolvedValue(null),
    };
    const now = new Date("2025-01-14T12:00:00Z");
    fakeClock = { now: () => now, sleep: async () => { } };
    fakeCron = { next: (_cron: string, from: Date) => new Date(from.getTime() + 3600_000) };

    manager = new JobsManager(mockJobsRepo, mockRunsRepo, mockSessionsRepo, fakeClock, fakeCron);
  });

  // ==================== Job Lifecycle Tests ====================

  describe("createJob", () => {
    it("creates job with correct fields", async () => {
      const mockJob: Job = {
        id: "job-1",
        userId: "user-1",
        name: "Test Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(mockJobsRepo.createJob).mockResolvedValue(mockJob);

      const result = await manager.createJob("user-1", { name: "Test Job" });

      expect(mockJobsRepo.createJob).toHaveBeenCalledWith({
        userId: "user-1",
        name: "Test Job",
        status: "active",
      });
      expect(result).toEqual(mockJob);
    });
  });

  describe("getJob", () => {
    it("returns job when user owns it", async () => {
      const mockJob: Job = {
        id: "job-1",
        userId: "user-1",
        name: "My Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);

      const result = await manager.getJob("user-1", "job-1");

      expect(result).toEqual(mockJob);
    });

    it("returns null when user does not own job", async () => {
      const mockJob: Job = {
        id: "job-1",
        userId: "user-2",
        name: "Someone else's job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);

      const result = await manager.getJob("user-1", "job-1");

      expect(result).toBeNull();
    });
  });

  describe("listJobs", () => {
    it("returns jobs for user", async () => {
      const mockJobs = [
        {
          id: "job-1",
          userId: "user-1",
          name: "Job 1",
          status: "active" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          endpointCount: 3,
        },
      ];
      vi.mocked(mockJobsRepo.listJobs).mockResolvedValue(mockJobs);

      const result = await manager.listJobs("user-1");

      expect(result).toEqual(mockJobs);
    });
  });

  describe("updateJob", () => {
    it("updates job when user owns it", async () => {
      const existingJob: Job = {
        id: "job-1",
        userId: "user-1",
        name: "Old Name",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedJob: Job = { ...existingJob, name: "New Name" };

      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(existingJob);
      vi.mocked(mockJobsRepo.updateJob).mockResolvedValue(updatedJob);

      const result = await manager.updateJob("user-1", "job-1", { name: "New Name" });

      expect(result).toEqual(updatedJob);
    });
  });

  describe("archiveJob", () => {
    it("archives job when user owns it", async () => {
      const existingJob: Job = {
        id: "job-1",
        userId: "user-1",
        name: "My Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const archivedJob: Job = { ...existingJob, status: "archived" };

      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(existingJob);
      vi.mocked(mockJobsRepo.archiveJob).mockResolvedValue(archivedJob);

      const result = await manager.archiveJob("user-1", "job-1");

      expect(result.status).toBe("archived");
    });
  });

  // ==================== Endpoint Orchestration Tests ====================

  describe("addEndpointToJob", () => {
    it("creates endpoint with calculated nextRunAt from interval", async () => {
      const mockJob: Job = {
        id: "job-1",
        userId: "user-1",
        name: "My Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const input: AddEndpointInput = {
        name: "Health Check",
        jobId: "job-1",
        baselineIntervalMs: 60_000, // 60s - meets free tier minimum
        url: "https://api.example.com/health",
        method: "GET",
      };

      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("free");
      vi.mocked(mockJobsRepo.countEndpointsByUser).mockResolvedValue(0);
      vi.mocked(mockJobsRepo.addEndpoint).mockResolvedValue(undefined);

      await manager.addEndpointToJob("user-1", input);

      expect(mockJobsRepo.addEndpoint).toHaveBeenCalled();
    });

    it("saves description and other optional fields when creating endpoint", async () => {
      const mockJob: Job = {
        id: "job-1",
        userId: "user-1",
        name: "My Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const input: AddEndpointInput = {
        name: "Health Check",
        jobId: "job-1",
        description: "Monitors API health and returns status metrics",
        baselineIntervalMs: 60_000,
        url: "https://api.example.com/health",
        method: "GET",
        maxExecutionTimeMs: 30_000,
        maxResponseSizeKb: 100,
      };

      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("free");
      vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.addEndpoint).mockResolvedValue(undefined);

      await manager.addEndpointToJob("user-1", input);

      // Verify that addEndpoint was called with an object containing all the fields
      expect(mockJobsRepo.addEndpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Health Check",
          description: "Monitors API health and returns status metrics",
          maxExecutionTimeMs: 30_000,
          maxResponseSizeKb: 100,
        }),
      );
    });

    it("rejects endpoint creation when free tier limit (10) exceeded", async () => {
      const mockJob: Job = {
        id: "job-1",
        userId: "user-1",
        name: "My Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const input: AddEndpointInput = {
        name: "Endpoint 11",
        jobId: "job-1",
        baselineIntervalMs: 60_000,
        url: "https://api.example.com/test",
        method: "GET",
      };

      // Mock 10 existing endpoints (free tier max) - across all jobs for this user
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("free");
      vi.mocked(mockJobsRepo.countEndpointsByUser).mockResolvedValue(10);

      await expect(manager.addEndpointToJob("user-1", input)).rejects.toThrow(
        /Endpoint limit reached: free tier allows maximum 5 endpoints. Upgrade to Pro for 100 endpoints or Enterprise for 1,000 endpoints./i,
      );
    });

    it("allows endpoint creation when under pro tier limit (100)", async () => {
      const mockJob: Job = {
        id: "job-1",
        userId: "user-1",
        name: "My Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const input: AddEndpointInput = {
        name: "Endpoint 51",
        jobId: "job-1",
        baselineIntervalMs: 10_000,
        url: "https://api.example.com/test",
        method: "GET",
      };

      // Mock 50 existing endpoints (under pro limit of 100) - across all jobs
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("pro");
      vi.mocked(mockJobsRepo.countEndpointsByUser).mockResolvedValue(50);
      vi.mocked(mockJobsRepo.addEndpoint).mockResolvedValue(undefined);

      await manager.addEndpointToJob("user-1", input);

      expect(mockJobsRepo.addEndpoint).toHaveBeenCalled();
    });

    it("rejects endpoint creation when enterprise tier limit (1000) exceeded", async () => {
      const mockJob: Job = {
        id: "job-1",
        userId: "user-1",
        name: "My Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const input: AddEndpointInput = {
        name: "Endpoint 1001",
        jobId: "job-1",
        baselineIntervalMs: 1_000,
        url: "https://api.example.com/test",
        method: "GET",
      };

      // Mock 1000 existing endpoints (enterprise tier max) - across all jobs
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("enterprise");
      vi.mocked(mockJobsRepo.countEndpointsByUser).mockResolvedValue(1000);

      await expect(manager.addEndpointToJob("user-1", input)).rejects.toThrow(
        /Endpoint limit reached.*enterprise tier allows maximum 1000 endpoints/i,
      );
    });

    it("rejects endpoint creation when interval below free tier minimum (60s)", async () => {
      const mockJob: Job = {
        id: "job-1",
        userId: "user-1",
        name: "My Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const input: AddEndpointInput = {
        name: "Fast Endpoint",
        jobId: "job-1",
        baselineIntervalMs: 30_000, // 30s - below free tier 60s minimum
        url: "https://api.example.com/test",
        method: "GET",
      };

      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("free");
      vi.mocked(mockJobsRepo.countEndpointsByUser).mockResolvedValue(0);

      await expect(manager.addEndpointToJob("user-1", input)).rejects.toThrow(
        /Interval too short.*free tier requires minimum 60000ms.*60s.*Upgrade to Pro/i,
      );
    });

    it("allows endpoint creation when interval meets pro tier minimum (10s)", async () => {
      const mockJob: Job = {
        id: "job-1",
        userId: "user-1",
        name: "My Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const input: AddEndpointInput = {
        name: "Pro Endpoint",
        jobId: "job-1",
        baselineIntervalMs: 10_000, // 10s - exactly pro tier minimum
        url: "https://api.example.com/test",
        method: "GET",
      };

      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("pro");
      vi.mocked(mockJobsRepo.countEndpointsByUser).mockResolvedValue(0);
      vi.mocked(mockJobsRepo.addEndpoint).mockResolvedValue(undefined);

      await manager.addEndpointToJob("user-1", input);

      expect(mockJobsRepo.addEndpoint).toHaveBeenCalled();
    });

    it("rejects endpoint creation when interval below pro tier minimum (10s)", async () => {
      const mockJob: Job = {
        id: "job-1",
        userId: "user-1",
        name: "My Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const input: AddEndpointInput = {
        name: "Too Fast",
        jobId: "job-1",
        baselineIntervalMs: 5_000, // 5s - below pro tier 10s minimum
        url: "https://api.example.com/test",
        method: "GET",
      };

      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("pro");
      vi.mocked(mockJobsRepo.countEndpointsByUser).mockResolvedValue(0);

      await expect(manager.addEndpointToJob("user-1", input)).rejects.toThrow(
        /Interval too short.*pro tier requires minimum 10000ms.*10s.*Upgrade to Enterprise/i,
      );
    });

    it("rejects endpoint creation when free tier limit (10) exceeded across multiple jobs", async () => {
      // This test verifies the fix: user has 5 endpoints in job-1 and 5 in job-2 (10 total)
      // Attempting to add an 11th endpoint should fail regardless of which job
      const mockJob: Job = {
        id: "job-1",
        userId: "user-1",
        name: "My Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const input: AddEndpointInput = {
        name: "Endpoint 11",
        jobId: "job-1",
        baselineIntervalMs: 60_000,
        url: "https://api.example.com/test",
        method: "GET",
      };

      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("free");
      // User has 10 endpoints across all jobs (e.g., 5 in job-1, 5 in job-2)
      vi.mocked(mockJobsRepo.countEndpointsByUser).mockResolvedValue(10);

      await expect(manager.addEndpointToJob("user-1", input)).rejects.toThrow(
        /Endpoint limit reached: free tier allows maximum 5 endpoints. Upgrade to Pro for 100 endpoints or Enterprise for 1,000 endpoints./i,
      );
    });
  });

  describe("listEndpointsByJob", () => {
    it("returns endpoints when user owns job", async () => {
      const mockJob: Job = {
        id: "job-1",
        userId: "user-1",
        name: "My Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
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
      ];

      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
      vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue(mockEndpoints);

      const result = await manager.listEndpointsByJob("user-1", "job-1");

      expect(result).toEqual(mockEndpoints);
    });
  });

  describe("getEndpoint", () => {
    it("returns endpoint when user owns it", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);

      const result = await manager.getEndpoint("user-1", "ep-1");

      expect(result).toEqual(mockEndpoint);
    });
  });

  describe("updateEndpointConfig", () => {
    it("updates endpoint configuration", async () => {
      const existingEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "Old Name",
        baselineIntervalMs: 60_000,
        nextRunAt: new Date(),
        failureCount: 0,
      };
      const updatedEndpoint: JobEndpoint = { ...existingEndpoint, name: "New Name" };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(existingEndpoint);
      vi.mocked(mockJobsRepo.updateEndpoint).mockResolvedValue(updatedEndpoint);

      const result = await manager.updateEndpointConfig("user-1", "ep-1", { name: "New Name" });

      expect(result.name).toBe("New Name");
    });

    it("rejects interval update when below tier minimum", async () => {
      const existingEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "Endpoint",
        baselineIntervalMs: 60_000,
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(existingEndpoint);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("free");

      await expect(
        manager.updateEndpointConfig("user-1", "ep-1", { baselineIntervalMs: 30_000 }),
      ).rejects.toThrow(/Interval too short.*free tier requires minimum 60000ms/);
    });

    it("allows interval update when meets tier minimum", async () => {
      const existingEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "Endpoint",
        baselineIntervalMs: 60_000,
        nextRunAt: new Date(),
        failureCount: 0,
      };
      const updatedEndpoint: JobEndpoint = { ...existingEndpoint, baselineIntervalMs: 15_000 };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(existingEndpoint);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("pro");
      vi.mocked(mockJobsRepo.updateEndpoint).mockResolvedValue(updatedEndpoint);

      const result = await manager.updateEndpointConfig("user-1", "ep-1", { baselineIntervalMs: 15_000 });

      expect(result.baselineIntervalMs).toBe(15_000);
    });
  });

  describe("deleteEndpoint", () => {
    it("deletes endpoint when user owns it", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.deleteEndpoint).mockResolvedValue(undefined);

      await manager.deleteEndpoint("user-1", "ep-1");

      expect(mockJobsRepo.deleteEndpoint).toHaveBeenCalledWith("ep-1");
    });
  });

  // ==================== Adaptive Scheduling Tests ====================

  describe("applyIntervalHint", () => {
    it("applies interval hint with TTL", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        minIntervalMs: 10_000,
        maxIntervalMs: 3600_000,
        lastRunAt: new Date("2025-01-14T11:00:00Z"),
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("enterprise");
      vi.mocked(mockJobsRepo.writeAIHint).mockResolvedValue(undefined);
      vi.mocked(mockJobsRepo.setNextRunAtIfEarlier).mockResolvedValue(undefined);

      await manager.applyIntervalHint("user-1", "ep-1", { intervalMs: 300_000 });

      expect(mockJobsRepo.writeAIHint).toHaveBeenCalled();
    });

    it("rejects AI hint when interval below tier minimum", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("free");

      await expect(
        manager.applyIntervalHint("user-1", "ep-1", { intervalMs: 30_000 }),
      ).rejects.toThrow(/AI hint interval too short.*free tier requires minimum 60000ms/);
    });

    it("allows AI hint when interval meets tier minimum", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        lastRunAt: new Date(),
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("pro");
      vi.mocked(mockJobsRepo.writeAIHint).mockResolvedValue(undefined);
      vi.mocked(mockJobsRepo.setNextRunAtIfEarlier).mockResolvedValue(undefined);

      await manager.applyIntervalHint("user-1", "ep-1", { intervalMs: 10_000 });

      expect(mockJobsRepo.writeAIHint).toHaveBeenCalled();
    });
  });

  describe("scheduleOneShotRun", () => {
    it("schedules one-shot run with ISO timestamp", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        nextRunAt: new Date("2025-01-14T15:00:00Z"),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.writeAIHint).mockResolvedValue(undefined);
      vi.mocked(mockJobsRepo.setNextRunAtIfEarlier).mockResolvedValue(undefined);

      await manager.scheduleOneShotRun("user-1", "ep-1", { nextRunAt: "2025-01-14T12:30:00Z" });

      expect(mockJobsRepo.writeAIHint).toHaveBeenCalled();
    });
  });

  describe("pauseOrResumeEndpoint", () => {
    it("pauses endpoint until specific date", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.setPausedUntil).mockResolvedValue(undefined);

      await manager.pauseOrResumeEndpoint("user-1", "ep-1", { pausedUntil: "2025-01-20T00:00:00Z" });

      expect(mockJobsRepo.setPausedUntil).toHaveBeenCalled();
    });
  });

  describe("clearAdaptiveHints", () => {
    it("clears all AI hints", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.clearAIHints).mockResolvedValue(undefined);

      await manager.clearAdaptiveHints("user-1", "ep-1");

      expect(mockJobsRepo.clearAIHints).toHaveBeenCalled();
    });
  });

  describe("resetFailureCount", () => {
    it("resets failure count to zero", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        nextRunAt: new Date(),
        failureCount: 5,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.resetFailureCount).mockResolvedValue(undefined);

      await manager.resetFailureCount("user-1", "ep-1");

      expect(mockJobsRepo.resetFailureCount).toHaveBeenCalled();
    });
  });

  // ==================== Execution Visibility Tests ====================

  describe("listRuns", () => {
    it("lists runs with pagination", async () => {
      const mockResult = {
        runs: [
          {
            runId: "run-1",
            endpointId: "ep-1",
            startedAt: new Date(),
            status: "success" as const,
            durationMs: 1234,
          },
        ],
        total: 42,
      };

      vi.mocked(mockRunsRepo.listRuns).mockResolvedValue(mockResult);

      const result = await manager.listRuns("user-1", { endpointId: "ep-1", limit: 20, offset: 10 });

      expect(result.total).toBe(42);
    });
  });

  describe("getRunDetails", () => {
    it("returns run details when user owns endpoint", async () => {
      const mockRun = {
        id: "run-1",
        endpointId: "ep-1",
        status: "success" as const,
        startedAt: new Date(),
        durationMs: 1234,
        attempt: 1,
      };
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockRunsRepo.getRunDetails).mockResolvedValue(mockRun);
      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);

      const result = await manager.getRunDetails("user-1", "run-1");

      expect(result?.attempt).toBe(1);
    });
  });

  describe("summarizeEndpointHealth", () => {
    it("returns health summary for endpoint", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        nextRunAt: new Date(),
        failureCount: 0,
      };
      const mockSummary = {
        successCount: 42,
        failureCount: 3,
        avgDurationMs: 1234.5,
        lastRun: null,
        failureStreak: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockRunsRepo.getHealthSummary).mockResolvedValue(mockSummary);

      const result = await manager.summarizeEndpointHealth("user-1", "ep-1");

      expect(result.successCount).toBe(42);
    });
  });

  // ==================== Validation Tests ====================

  describe("createJob validation", () => {
    it("rejects empty job name", async () => {
      await expect(manager.createJob("user-1", { name: "" })).rejects.toThrow("Job name is required");
    });

    it("rejects whitespace-only job name", async () => {
      await expect(manager.createJob("user-1", { name: "   " })).rejects.toThrow("Job name is required");
    });

    it("rejects job name exceeding 255 characters", async () => {
      await expect(manager.createJob("user-1", { name: "a".repeat(256) })).rejects.toThrow(
        "Job name must be 255 characters or less",
      );
    });

    it("rejects job description exceeding 1000 characters", async () => {
      await expect(
        manager.createJob("user-1", { name: "Valid", description: "a".repeat(1001) }),
      ).rejects.toThrow("Job description must be 1000 characters or less");
    });
  });

  describe("addEndpointToJob validation", () => {
    const mockJob: Job = {
      id: "job-1",
      userId: "user-1",
      name: "My Job",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("rejects empty endpoint name", async () => {
      await expect(
        manager.addEndpointToJob("user-1", {
          name: "",
          jobId: "job-1",
          baselineIntervalMs: 60_000,
          url: "https://example.com",
          method: "GET",
        }),
      ).rejects.toThrow("Endpoint name is required");
    });

    it("rejects endpoint name exceeding 255 characters", async () => {
      await expect(
        manager.addEndpointToJob("user-1", {
          name: "a".repeat(256),
          jobId: "job-1",
          baselineIntervalMs: 60_000,
          url: "https://example.com",
          method: "GET",
        }),
      ).rejects.toThrow("Endpoint name must be 255 characters or less");
    });

    it("rejects endpoint description exceeding 2000 characters", async () => {
      await expect(
        manager.addEndpointToJob("user-1", {
          name: "Valid",
          jobId: "job-1",
          description: "a".repeat(2001),
          baselineIntervalMs: 60_000,
          url: "https://example.com",
          method: "GET",
        }),
      ).rejects.toThrow("Endpoint description must be 2000 characters or less");
    });

    it("rejects when neither cron nor interval provided", async () => {
      await expect(
        manager.addEndpointToJob("user-1", {
          name: "Test",
          jobId: "job-1",
          url: "https://example.com",
          method: "GET",
        }),
      ).rejects.toThrow("Endpoint must have either baselineCron or baselineIntervalMs");
    });

    it("rejects when both cron and interval provided", async () => {
      await expect(
        manager.addEndpointToJob("user-1", {
          name: "Test",
          jobId: "job-1",
          baselineCron: "* * * * *",
          baselineIntervalMs: 60_000,
          url: "https://example.com",
          method: "GET",
        }),
      ).rejects.toThrow("Endpoint cannot have both baselineCron and baselineIntervalMs");
    });

    it("rejects interval below 1000ms", async () => {
      await expect(
        manager.addEndpointToJob("user-1", {
          name: "Test",
          jobId: "job-1",
          baselineIntervalMs: 500,
          url: "https://example.com",
          method: "GET",
        }),
      ).rejects.toThrow("Baseline interval must be at least 1000ms");
    });

    it("rejects invalid URL", async () => {
      await expect(
        manager.addEndpointToJob("user-1", {
          name: "Test",
          jobId: "job-1",
          baselineIntervalMs: 60_000,
          url: "not-a-url",
          method: "GET",
        }),
      ).rejects.toThrow("Endpoint URL must be a valid URL");
    });

    it("rejects empty URL", async () => {
      await expect(
        manager.addEndpointToJob("user-1", {
          name: "Test",
          jobId: "job-1",
          baselineIntervalMs: 60_000,
          url: "",
          method: "GET",
        }),
      ).rejects.toThrow("Endpoint URL is required");
    });

    it("rejects negative timeout", async () => {
      await expect(
        manager.addEndpointToJob("user-1", {
          name: "Test",
          jobId: "job-1",
          baselineIntervalMs: 60_000,
          url: "https://example.com",
          method: "GET",
          timeoutMs: -1,
        }),
      ).rejects.toThrow("Timeout must be a positive number");
    });

    it("rejects maxExecutionTimeMs exceeding 30 minutes", async () => {
      await expect(
        manager.addEndpointToJob("user-1", {
          name: "Test",
          jobId: "job-1",
          baselineIntervalMs: 60_000,
          url: "https://example.com",
          method: "GET",
          maxExecutionTimeMs: 1800001,
        }),
      ).rejects.toThrow("Max execution time must be between 0 and 1800000ms");
    });

    it("rejects negative maxResponseSizeKb", async () => {
      await expect(
        manager.addEndpointToJob("user-1", {
          name: "Test",
          jobId: "job-1",
          baselineIntervalMs: 60_000,
          url: "https://example.com",
          method: "GET",
          maxResponseSizeKb: -1,
        }),
      ).rejects.toThrow("Max response size must be a positive number");
    });

    it("rejects max interval less than min interval", async () => {
      await expect(
        manager.addEndpointToJob("user-1", {
          name: "Test",
          jobId: "job-1",
          baselineIntervalMs: 60_000,
          url: "https://example.com",
          method: "GET",
          minIntervalMs: 30_000,
          maxIntervalMs: 10_000,
        }),
      ).rejects.toThrow("Maximum interval must be greater than minimum interval");
    });

    it("creates endpoint with cron-based schedule", async () => {
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("free");
      vi.mocked(mockJobsRepo.countEndpointsByUser).mockResolvedValue(0);
      vi.mocked(mockJobsRepo.addEndpoint).mockResolvedValue(undefined);

      const result = await manager.addEndpointToJob("user-1", {
        name: "Cron Endpoint",
        jobId: "job-1",
        baselineCron: "0 * * * *",
        url: "https://example.com",
        method: "GET",
      });

      expect(result.baselineCron).toBe("0 * * * *");
      expect(result.baselineIntervalMs).toBeUndefined();
      expect(mockJobsRepo.addEndpoint).toHaveBeenCalled();
    });

    it("rejects endpoint creation for unauthorized job", async () => {
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(null);

      await expect(
        manager.addEndpointToJob("user-1", {
          name: "Test",
          jobId: "job-1",
          baselineIntervalMs: 60_000,
          url: "https://example.com",
          method: "GET",
        }),
      ).rejects.toThrow("Job not found or unauthorized");
    });
  });

  // ==================== Authorization Rejection Tests ====================

  describe("authorization rejections", () => {
    it("updateJob rejects unauthorized access", async () => {
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(null);

      await expect(manager.updateJob("user-1", "job-1", { name: "New" })).rejects.toThrow(
        "Job not found or unauthorized",
      );
    });

    it("archiveJob rejects unauthorized access", async () => {
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(null);

      await expect(manager.archiveJob("user-1", "job-1")).rejects.toThrow(
        "Job not found or unauthorized",
      );
    });

    it("pauseJob rejects unauthorized access", async () => {
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(null);

      await expect(manager.pauseJob("user-1", "job-1")).rejects.toThrow(
        "Job not found or unauthorized",
      );
    });

    it("resumeJob rejects unauthorized access", async () => {
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(null);

      await expect(manager.resumeJob("user-1", "job-1")).rejects.toThrow(
        "Job not found or unauthorized",
      );
    });

    it("listEndpointsByJob rejects unauthorized access", async () => {
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(null);

      await expect(manager.listEndpointsByJob("user-1", "job-1")).rejects.toThrow(
        "Job not found or unauthorized",
      );
    });

    it("getEndpoint returns null for unauthorized access", async () => {
      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue({
        id: "ep-1",
        tenantId: "user-2",
        name: "Not Mine",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      const result = await manager.getEndpoint("user-1", "ep-1");

      expect(result).toBeNull();
    });

    it("updateEndpointConfig rejects unauthorized access", async () => {
      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue({
        id: "ep-1",
        tenantId: "user-2",
        name: "Not Mine",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      await expect(
        manager.updateEndpointConfig("user-1", "ep-1", { name: "New" }),
      ).rejects.toThrow("Endpoint not found or unauthorized");
    });

    it("deleteEndpoint rejects unauthorized access", async () => {
      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue({
        id: "ep-1",
        tenantId: "user-2",
        name: "Not Mine",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      await expect(manager.deleteEndpoint("user-1", "ep-1")).rejects.toThrow(
        "Endpoint not found or unauthorized",
      );
    });

    it("archiveEndpoint rejects unauthorized access", async () => {
      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue({
        id: "ep-1",
        tenantId: "user-2",
        name: "Not Mine",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      await expect(manager.archiveEndpoint("user-1", "ep-1")).rejects.toThrow(
        "Endpoint not found or unauthorized",
      );
    });

    it("applyIntervalHint rejects unauthorized access", async () => {
      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue({
        id: "ep-1",
        tenantId: "user-2",
        name: "Not Mine",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      await expect(
        manager.applyIntervalHint("user-1", "ep-1", { intervalMs: 60_000 }),
      ).rejects.toThrow("Endpoint not found or unauthorized");
    });

    it("scheduleOneShotRun rejects unauthorized access", async () => {
      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue({
        id: "ep-1",
        tenantId: "user-2",
        name: "Not Mine",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      await expect(
        manager.scheduleOneShotRun("user-1", "ep-1", { nextRunAt: "2025-12-01T00:00:00Z" }),
      ).rejects.toThrow("Endpoint not found or unauthorized");
    });

    it("pauseOrResumeEndpoint rejects unauthorized access", async () => {
      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue({
        id: "ep-1",
        tenantId: "user-2",
        name: "Not Mine",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      await expect(
        manager.pauseOrResumeEndpoint("user-1", "ep-1", { pausedUntil: null }),
      ).rejects.toThrow("Endpoint not found or unauthorized");
    });

    it("clearAdaptiveHints rejects unauthorized access", async () => {
      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue({
        id: "ep-1",
        tenantId: "user-2",
        name: "Not Mine",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      await expect(manager.clearAdaptiveHints("user-1", "ep-1")).rejects.toThrow(
        "Endpoint not found or unauthorized",
      );
    });

    it("resetFailureCount rejects unauthorized access", async () => {
      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue({
        id: "ep-1",
        tenantId: "user-2",
        name: "Not Mine",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      await expect(manager.resetFailureCount("user-1", "ep-1")).rejects.toThrow(
        "Endpoint not found or unauthorized",
      );
    });

    it("summarizeEndpointHealth rejects unauthorized access", async () => {
      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue({
        id: "ep-1",
        tenantId: "user-2",
        name: "Not Mine",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      await expect(manager.summarizeEndpointHealth("user-1", "ep-1")).rejects.toThrow(
        "Endpoint not found or unauthorized",
      );
    });

    it("getRunDetails returns null when run not found", async () => {
      vi.mocked(mockRunsRepo.getRunDetails).mockResolvedValue(null);

      const result = await manager.getRunDetails("user-1", "run-1");

      expect(result).toBeNull();
    });

    it("getRunDetails returns null when user does not own endpoint", async () => {
      vi.mocked(mockRunsRepo.getRunDetails).mockResolvedValue({
        id: "run-1",
        endpointId: "ep-1",
        status: "success",
        startedAt: new Date(),
        attempt: 1,
      });
      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue({
        id: "ep-1",
        tenantId: "user-2",
        name: "Not Mine",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      const result = await manager.getRunDetails("user-1", "run-1");

      expect(result).toBeNull();
    });

    it("listSessions rejects unauthorized access", async () => {
      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue({
        id: "ep-1",
        tenantId: "user-2",
        name: "Not Mine",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      await expect(manager.listSessions("user-1", "ep-1")).rejects.toThrow(
        "Endpoint not found or unauthorized",
      );
    });

    it("getSession returns null when session not found", async () => {
      vi.mocked(mockSessionsRepo.getSession).mockResolvedValue(null);

      const result = await manager.getSession("user-1", "session-1");

      expect(result).toBeNull();
    });

    it("getSession returns null when user does not own endpoint", async () => {
      vi.mocked(mockSessionsRepo.getSession).mockResolvedValue({
        id: "session-1",
        endpointId: "ep-1",
        endpointName: "Test",
        analyzedAt: new Date(),
        toolCalls: [],
        reasoning: "test",
        tokenUsage: 100,
        durationMs: 500,
        warnings: [],
      });
      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue({
        id: "ep-1",
        tenantId: "user-2",
        name: "Not Mine",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      const result = await manager.getSession("user-1", "session-1");

      expect(result).toBeNull();
    });
  });

  // ==================== Missing Method Tests ====================

  describe("pauseJob", () => {
    it("pauses job when user owns it", async () => {
      const existingJob: Job = {
        id: "job-1",
        userId: "user-1",
        name: "My Job",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const pausedJob: Job = { ...existingJob, status: "paused" };

      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(existingJob);
      vi.mocked(mockJobsRepo.pauseJob).mockResolvedValue(pausedJob);

      const result = await manager.pauseJob("user-1", "job-1");

      expect(result.status).toBe("paused");
      expect(mockJobsRepo.pauseJob).toHaveBeenCalledWith("job-1");
    });
  });

  describe("resumeJob", () => {
    it("resumes paused job when user owns it", async () => {
      const existingJob: Job = {
        id: "job-1",
        userId: "user-1",
        name: "My Job",
        status: "paused",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const resumedJob: Job = { ...existingJob, status: "active" };

      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(existingJob);
      vi.mocked(mockJobsRepo.resumeJob).mockResolvedValue(resumedJob);

      const result = await manager.resumeJob("user-1", "job-1");

      expect(result.status).toBe("active");
      expect(mockJobsRepo.resumeJob).toHaveBeenCalledWith("job-1");
    });
  });

  describe("archiveEndpoint", () => {
    it("archives endpoint when user owns it", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        nextRunAt: new Date(),
        failureCount: 0,
      };
      const archivedEndpoint: JobEndpoint = {
        ...mockEndpoint,
        archivedAt: new Date(),
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.archiveEndpoint).mockResolvedValue(archivedEndpoint);

      const result = await manager.archiveEndpoint("user-1", "ep-1");

      expect(result.archivedAt).toBeDefined();
      expect(mockJobsRepo.archiveEndpoint).toHaveBeenCalledWith("ep-1");
    });
  });

  describe("recordTestRun", () => {
    it("creates and finishes test run", async () => {
      vi.mocked(mockRunsRepo.create).mockResolvedValue("run-test-1");
      vi.mocked(mockRunsRepo.finish).mockResolvedValue(undefined);

      const result = await manager.recordTestRun("ep-1", {
        status: "success",
        durationMs: 250,
        statusCode: 200,
        responseBody: { ok: true },
      });

      expect(result.runId).toBe("run-test-1");
      expect(result.status).toBe("success");
      expect(result.durationMs).toBe(250);
      expect(result.statusCode).toBe(200);
      expect(result.responseBody).toEqual({ ok: true });

      expect(mockRunsRepo.create).toHaveBeenCalledWith({
        endpointId: "ep-1",
        status: "running",
        attempt: 1,
        source: "test",
      });
      expect(mockRunsRepo.finish).toHaveBeenCalledWith("run-test-1", {
        status: "success",
        durationMs: 250,
        statusCode: 200,
        responseBody: { ok: true },
        err: undefined,
      });
    });

    it("records failed test run with error", async () => {
      vi.mocked(mockRunsRepo.create).mockResolvedValue("run-test-2");
      vi.mocked(mockRunsRepo.finish).mockResolvedValue(undefined);

      const result = await manager.recordTestRun("ep-1", {
        status: "failed",
        durationMs: 5000,
        errorMessage: "Connection timeout",
        statusCode: 504,
      });

      expect(result.status).toBe("failed");
      expect(result.errorMessage).toBe("Connection timeout");
    });
  });

  describe("getUsage", () => {
    it("delegates to jobsRepo", async () => {
      const mockUsage = {
        aiCallsUsed: 50,
        aiCallsLimit: 100_000,
        endpointsUsed: 3,
        endpointsLimit: 5,
        totalRuns: 1200,
        totalRunsLimit: 10_000,
      };
      vi.mocked(mockJobsRepo.getUsage).mockResolvedValue(mockUsage);

      const since = new Date("2025-01-01T00:00:00Z");
      const result = await manager.getUsage("user-1", since);

      expect(result).toEqual(mockUsage);
      expect(mockJobsRepo.getUsage).toHaveBeenCalledWith("user-1", since);
    });
  });

  describe("listSessions", () => {
    it("returns sessions for authorized endpoint", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        nextRunAt: new Date(),
        failureCount: 0,
      };
      const mockSessions = [
        {
          id: "session-1",
          analyzedAt: new Date(),
          toolCalls: [{ tool: "set_interval", args: {}, result: {} }],
          reasoning: "Adjusted interval",
          tokenUsage: 500,
          durationMs: 1200,
          warnings: [],
        },
      ];

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockSessionsRepo.getRecentSessions).mockResolvedValue(mockSessions);
      vi.mocked(mockSessionsRepo.getTotalSessionCount).mockResolvedValue(1);

      const result = await manager.listSessions("user-1", "ep-1");

      expect(result.sessions).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe("getSession", () => {
    it("returns session when user owns endpoint", async () => {
      const mockSession = {
        id: "session-1",
        endpointId: "ep-1",
        endpointName: "Test Endpoint",
        analyzedAt: new Date(),
        toolCalls: [],
        reasoning: "test reasoning",
        tokenUsage: 100,
        durationMs: 500,
        warnings: [],
      };
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "Test Endpoint",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockSessionsRepo.getSession).mockResolvedValue(mockSession);
      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);

      const result = await manager.getSession("user-1", "session-1");

      expect(result).toEqual(mockSession);
    });
  });

  // ==================== Adaptive Scheduling Edge Cases ====================

  describe("applyIntervalHint edge cases", () => {
    it("rejects hint below endpoint min interval", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        minIntervalMs: 30_000,
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("enterprise");

      await expect(
        manager.applyIntervalHint("user-1", "ep-1", { intervalMs: 20_000 }),
      ).rejects.toThrow(/below minimum/);
    });

    it("rejects hint above endpoint max interval", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        maxIntervalMs: 600_000,
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("enterprise");

      await expect(
        manager.applyIntervalHint("user-1", "ep-1", { intervalMs: 700_000 }),
      ).rejects.toThrow(/exceeds maximum/);
    });
  });

  describe("scheduleOneShotRun edge cases", () => {
    it("schedules using nextRunInMs", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        nextRunAt: new Date("2025-01-14T15:00:00Z"),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.writeAIHint).mockResolvedValue(undefined);
      vi.mocked(mockJobsRepo.setNextRunAtIfEarlier).mockResolvedValue(undefined);

      await manager.scheduleOneShotRun("user-1", "ep-1", { nextRunInMs: 300_000 });

      expect(mockJobsRepo.writeAIHint).toHaveBeenCalled();
    });

    it("rejects when neither nextRunAt nor nextRunInMs provided", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);

      await expect(
        manager.scheduleOneShotRun("user-1", "ep-1", {}),
      ).rejects.toThrow("Must provide either nextRunAt or nextRunInMs");
    });

    it("rejects nextRunAt in the past", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);

      await expect(
        manager.scheduleOneShotRun("user-1", "ep-1", { nextRunAt: "2020-01-01T00:00:00Z" }),
      ).rejects.toThrow("nextRunAt must be in the future");
    });
  });

  describe("pauseOrResumeEndpoint edge cases", () => {
    it("resumes endpoint by passing null", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.setPausedUntil).mockResolvedValue(undefined);

      await manager.pauseOrResumeEndpoint("user-1", "ep-1", { pausedUntil: null });

      expect(mockJobsRepo.setPausedUntil).toHaveBeenCalledWith("ep-1", null);
    });

    it("pauses endpoint with Date object", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        nextRunAt: new Date(),
        failureCount: 0,
      };
      const pauseDate = new Date("2025-06-01T00:00:00Z");

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.setPausedUntil).mockResolvedValue(undefined);

      await manager.pauseOrResumeEndpoint("user-1", "ep-1", { pausedUntil: pauseDate });

      expect(mockJobsRepo.setPausedUntil).toHaveBeenCalledWith("ep-1", pauseDate);
    });
  });

  describe("updateEndpointConfig schedule recalculation", () => {
    it("recalculates nextRunAt when cron changes", async () => {
      const existingEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "Endpoint",
        baselineCron: "0 * * * *",
        nextRunAt: new Date(),
        failureCount: 0,
      };
      const updatedEndpoint: JobEndpoint = { ...existingEndpoint, baselineCron: "*/5 * * * *" };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(existingEndpoint);
      vi.mocked(mockJobsRepo.updateEndpoint).mockResolvedValue(updatedEndpoint);

      await manager.updateEndpointConfig("user-1", "ep-1", { baselineCron: "*/5 * * * *" });

      expect(mockJobsRepo.updateEndpoint).toHaveBeenCalledWith(
        "ep-1",
        expect.objectContaining({ nextRunAt: expect.any(Date) }),
      );
    });

    it("recalculates nextRunAt when interval changes", async () => {
      const existingEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "Endpoint",
        baselineIntervalMs: 60_000,
        nextRunAt: new Date(),
        failureCount: 0,
      };
      const updatedEndpoint: JobEndpoint = { ...existingEndpoint, baselineIntervalMs: 120_000 };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(existingEndpoint);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("pro");
      vi.mocked(mockJobsRepo.updateEndpoint).mockResolvedValue(updatedEndpoint);

      await manager.updateEndpointConfig("user-1", "ep-1", { baselineIntervalMs: 120_000 });

      expect(mockJobsRepo.updateEndpoint).toHaveBeenCalledWith(
        "ep-1",
        expect.objectContaining({ nextRunAt: expect.any(Date) }),
      );
    });
  });

  // ==================== Additional Coverage Edge Cases ====================

  describe("addEndpointToJob - tier message variants", () => {
    const mockJob: Job = {
      id: "job-1",
      userId: "user-1",
      name: "My Job",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("shows pro upgrade message when pro tier endpoint limit reached", async () => {
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("pro");
      vi.mocked(mockJobsRepo.countEndpointsByUser).mockResolvedValue(100);

      await expect(
        manager.addEndpointToJob("user-1", {
          name: "Over Limit",
          jobId: "job-1",
          baselineIntervalMs: 10_000,
          url: "https://example.com",
          method: "GET",
        }),
      ).rejects.toThrow(/Upgrade to Enterprise for 1,000 endpoints/);
    });

    it("shows enterprise interval message when enterprise tier interval below minimum", async () => {
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("enterprise");
      vi.mocked(mockJobsRepo.countEndpointsByUser).mockResolvedValue(0);

      await expect(
        manager.addEndpointToJob("user-1", {
          name: "Too Fast",
          jobId: "job-1",
          baselineIntervalMs: 500, // below 1s enterprise minimum
          url: "https://example.com",
          method: "GET",
        }),
      ).rejects.toThrow(/Baseline interval must be at least 1000ms/);
    });

    it("rejects min interval below 1000ms", async () => {
      await expect(
        manager.addEndpointToJob("user-1", {
          name: "Test",
          jobId: "job-1",
          baselineIntervalMs: 60_000,
          url: "https://example.com",
          method: "GET",
          minIntervalMs: 500,
        }),
      ).rejects.toThrow("Minimum interval must be at least 1000ms");
    });
  });

  describe("updateEndpointConfig - tier message variants", () => {
    it("shows pro tier upgrade message when interval too short", async () => {
      const existingEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "Endpoint",
        baselineIntervalMs: 60_000,
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(existingEndpoint);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("pro");

      await expect(
        manager.updateEndpointConfig("user-1", "ep-1", { baselineIntervalMs: 5_000 }),
      ).rejects.toThrow(/Upgrade to Enterprise for 1s minimum interval/);
    });

    it("shows enterprise tier message (no upgrade available) when interval too short", async () => {
      const existingEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "Endpoint",
        baselineIntervalMs: 60_000,
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(existingEndpoint);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("enterprise");

      await expect(
        manager.updateEndpointConfig("user-1", "ep-1", { baselineIntervalMs: 500 }),
      ).rejects.toThrow(/enterprise tier requires minimum 1000ms/);
    });
  });

  describe("applyIntervalHint - tier message variants", () => {
    it("shows pro tier upgrade message", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "Endpoint",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("pro");

      await expect(
        manager.applyIntervalHint("user-1", "ep-1", { intervalMs: 5_000 }),
      ).rejects.toThrow(/Upgrade to Enterprise for 1s minimum interval/);
    });

    it("shows enterprise tier message (no upgrade)", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "Endpoint",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("enterprise");

      await expect(
        manager.applyIntervalHint("user-1", "ep-1", { intervalMs: 500 }),
      ).rejects.toThrow(/enterprise tier requires minimum 1000ms/);
    });
  });

  describe("scheduleOneShotRun - Date object input", () => {
    it("accepts nextRunAt as Date object", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "My Endpoint",
        nextRunAt: new Date("2025-01-14T15:00:00Z"),
        failureCount: 0,
      };
      const futureDate = new Date("2025-01-14T13:00:00Z");

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.writeAIHint).mockResolvedValue(undefined);
      vi.mocked(mockJobsRepo.setNextRunAtIfEarlier).mockResolvedValue(undefined);

      await manager.scheduleOneShotRun("user-1", "ep-1", { nextRunAt: futureDate });

      expect(mockJobsRepo.writeAIHint).toHaveBeenCalledWith(
        "ep-1",
        expect.objectContaining({ nextRunAt: futureDate }),
      );
    });
  });
});
