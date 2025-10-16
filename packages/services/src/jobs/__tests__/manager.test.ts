import type { Clock, Cron, Job, JobEndpoint, JobsRepo, RunsRepo } from "@cronicorn/domain";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AddEndpointInput } from "../manager.js";

import { JobsManager } from "../manager.js";

/**
 * Test suite for JobsManager covering all 17 public actions.
 */
describe("jobsManager", () => {
  let mockJobsRepo: JobsRepo;
  let mockRunsRepo: RunsRepo;
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
      addEndpoint: vi.fn(),
      updateEndpoint: vi.fn(),
      listEndpointsByJob: vi.fn(),
      getEndpoint: vi.fn(),
      deleteEndpoint: vi.fn(),
      claimDueEndpoints: vi.fn(),
      setLock: vi.fn(),
      clearLock: vi.fn(),
      setNextRunAtIfEarlier: vi.fn(),
      writeAIHint: vi.fn(),
      clearAIHints: vi.fn(),
      resetFailureCount: vi.fn(),
      setPausedUntil: vi.fn(),
      updateAfterRun: vi.fn(),
    };
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
    };
    const now = new Date("2025-01-14T12:00:00Z");
    fakeClock = { now: () => now, sleep: async () => { } };
    fakeCron = { next: (_cron: string, from: Date) => new Date(from.getTime() + 3600_000) };

    manager = new JobsManager(mockJobsRepo, mockRunsRepo, fakeClock, fakeCron);
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
      vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue([]);
      vi.mocked(mockJobsRepo.addEndpoint).mockResolvedValue(undefined);

      await manager.addEndpointToJob("user-1", input);

      expect(mockJobsRepo.addEndpoint).toHaveBeenCalled();
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

      // Mock 10 existing endpoints (free tier max)
      const existingEndpoints: JobEndpoint[] = Array.from({ length: 10 }, (_, i) => ({
        id: `ep-${i}`,
        jobId: "job-1",
        tenantId: "user-1",
        name: `Endpoint ${i}`,
        nextRunAt: new Date(),
        failureCount: 0,
      }));

      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("free");
      vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue(existingEndpoints);

      await expect(manager.addEndpointToJob("user-1", input)).rejects.toThrow(
        /Endpoint limit reached.*free tier allows maximum 10 endpoints.*Upgrade to Pro/i,
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

      // Mock 50 existing endpoints (under pro limit of 100)
      const existingEndpoints: JobEndpoint[] = Array.from({ length: 50 }, (_, i) => ({
        id: `ep-${i}`,
        jobId: "job-1",
        tenantId: "user-1",
        name: `Endpoint ${i}`,
        nextRunAt: new Date(),
        failureCount: 0,
      }));

      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("pro");
      vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue(existingEndpoints);
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

      // Mock 1000 existing endpoints (enterprise tier max)
      const existingEndpoints: JobEndpoint[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `ep-${i}`,
        jobId: "job-1",
        tenantId: "user-1",
        name: `Endpoint ${i}`,
        nextRunAt: new Date(),
        failureCount: 0,
      }));

      vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
      vi.mocked(mockJobsRepo.getUserTier).mockResolvedValue("enterprise");
      vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue(existingEndpoints);

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
      vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue([]);

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
      vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue([]);
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
      vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue([]);

      await expect(manager.addEndpointToJob("user-1", input)).rejects.toThrow(
        /Interval too short.*pro tier requires minimum 10000ms.*10s.*Upgrade to Enterprise/i,
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
});
