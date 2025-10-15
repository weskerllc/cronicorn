import type { Clock, JobEndpoint, JobsRepo, RunsRepo } from "@cronicorn/domain";
import type { AIClient } from "@cronicorn/scheduler";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { AIPlanner } from "../planner.js";

describe("aiPlanner", () => {
  let mockJobsRepo: JobsRepo;
  let mockRunsRepo: RunsRepo;
  let mockAIClient: AIClient;
  let fakeClock: Clock;
  let planner: AIPlanner;

  beforeEach(() => {
    const now = new Date("2025-10-15T12:00:00Z");
    fakeClock = {
      now: () => now,
      sleep: async () => { },
    };

    mockJobsRepo = {
      getEndpoint: vi.fn(),
      writeAIHint: vi.fn(),
      setNextRunAtIfEarlier: vi.fn(),
      setPausedUntil: vi.fn(),
      // Add other required methods as stubs
      createJob: vi.fn(),
      getJob: vi.fn(),
      listJobs: vi.fn(),
      updateJob: vi.fn(),
      archiveJob: vi.fn(),
      addEndpoint: vi.fn(),
      updateEndpoint: vi.fn(),
      listEndpointsByJob: vi.fn(),
      deleteEndpoint: vi.fn(),
      claimDueEndpoints: vi.fn(),
      setLock: vi.fn(),
      clearLock: vi.fn(),
      clearAIHints: vi.fn(),
      resetFailureCount: vi.fn(),
      updateAfterRun: vi.fn(),
    };

    mockRunsRepo = {
      getHealthSummary: vi.fn(),
      // Add other required methods as stubs
      create: vi.fn(),
      finish: vi.fn(),
      listRuns: vi.fn(),
      getRunDetails: vi.fn(),
      getEndpointsWithRecentRuns: vi.fn(),
    };

    mockAIClient = {
      planWithTools: vi.fn(),
    };

    planner = new AIPlanner({
      aiClient: mockAIClient,
      jobs: mockJobsRepo,
      runs: mockRunsRepo,
      clock: fakeClock,
    });
  });

  describe("analyzeEndpoint", () => {
    it("fetches endpoint state and health summary", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "Health Check",
        baselineIntervalMs: 60_000,
        nextRunAt: new Date("2025-10-15T13:00:00Z"),
        failureCount: 2,
      };

      const mockHealth = {
        successCount: 42,
        failureCount: 3,
        avgDurationMs: 150.5,
        lastRun: {
          status: "success" as const,
          at: new Date("2025-10-15T11:55:00Z"),
        },
        failureStreak: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockRunsRepo.getHealthSummary).mockResolvedValue(mockHealth);
      vi.mocked(mockAIClient.planWithTools).mockResolvedValue({ text: "Analysis complete" });

      await planner.analyzeEndpoint("ep-1");

      // Verify endpoint fetch
      expect(mockJobsRepo.getEndpoint).toHaveBeenCalledWith("ep-1");

      // Verify health summary fetch (last 24 hours)
      const expectedSince = new Date("2025-10-14T12:00:00Z");
      expect(mockRunsRepo.getHealthSummary).toHaveBeenCalledWith("ep-1", expectedSince);

      // Verify AI invocation
      expect(mockAIClient.planWithTools).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.stringContaining("Health Check"),
          tools: expect.any(Object),
          maxTokens: 500,
        }),
      );
    });

    it("builds prompt with endpoint and health data", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "API Monitor",
        baselineCron: "0 9 * * 1", // Monday at 9 AM
        lastRunAt: new Date("2025-10-14T09:00:00Z"),
        nextRunAt: new Date("2025-10-21T09:00:00Z"),
        failureCount: 5,
      };

      const mockHealth = {
        successCount: 10,
        failureCount: 15,
        avgDurationMs: 2500.0,
        lastRun: {
          status: "failure" as const,
          at: new Date("2025-10-14T09:00:00Z"),
        },
        failureStreak: 3,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockRunsRepo.getHealthSummary).mockResolvedValue(mockHealth);
      vi.mocked(mockAIClient.planWithTools).mockResolvedValue({ text: "Analysis complete" });

      await planner.analyzeEndpoint("ep-1");

      const aiCall = vi.mocked(mockAIClient.planWithTools).mock.calls[0][0];
      const prompt = aiCall.input;

      // Verify prompt contains endpoint data
      expect(prompt).toContain("API Monitor");
      expect(prompt).toContain("0 9 * * 1");
      expect(prompt).toContain("Failure Count: 5");

      // Verify prompt contains health metrics
      expect(prompt).toContain("Total Runs: 25");
      expect(prompt).toContain("Success Rate: 40.0%");
      expect(prompt).toContain("Avg Duration: 2500ms");
      expect(prompt).toContain("Failure Streak: 3 consecutive failures");
    });

    it("passes endpoint-scoped tools to AI", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "Test Endpoint",
        baselineIntervalMs: 30_000,
        nextRunAt: new Date(),
        failureCount: 0,
      };

      const mockHealth = {
        successCount: 100,
        failureCount: 0,
        avgDurationMs: 50.0,
        lastRun: null,
        failureStreak: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockRunsRepo.getHealthSummary).mockResolvedValue(mockHealth);
      vi.mocked(mockAIClient.planWithTools).mockResolvedValue({ text: "Analysis complete" });

      await planner.analyzeEndpoint("ep-1");

      const aiCall = vi.mocked(mockAIClient.planWithTools).mock.calls[0][0];
      const tools = aiCall.tools;

      // Verify tools object structure
      expect(tools).toHaveProperty("propose_interval");
      expect(tools).toHaveProperty("propose_next_time");
      expect(tools).toHaveProperty("pause_until");
    });
  });

  describe("analyzeEndpoints", () => {
    it("analyzes multiple endpoints sequentially", async () => {
      const mockEndpoint1: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "Endpoint 1",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      const mockEndpoint2: JobEndpoint = {
        id: "ep-2",
        tenantId: "user-1",
        name: "Endpoint 2",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      const mockHealth = {
        successCount: 10,
        failureCount: 0,
        avgDurationMs: 100.0,
        lastRun: null,
        failureStreak: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint)
        .mockResolvedValueOnce(mockEndpoint1)
        .mockResolvedValueOnce(mockEndpoint2);
      vi.mocked(mockRunsRepo.getHealthSummary).mockResolvedValue(mockHealth);
      vi.mocked(mockAIClient.planWithTools).mockResolvedValue({ text: "Analysis complete" });

      await planner.analyzeEndpoints(["ep-1", "ep-2"]);

      expect(mockJobsRepo.getEndpoint).toHaveBeenCalledTimes(2);
      expect(mockJobsRepo.getEndpoint).toHaveBeenNthCalledWith(1, "ep-1");
      expect(mockJobsRepo.getEndpoint).toHaveBeenNthCalledWith(2, "ep-2");
      expect(mockAIClient.planWithTools).toHaveBeenCalledTimes(2);
    });

    it("continues analyzing remaining endpoints when one fails", async () => {
      const mockEndpoint2: JobEndpoint = {
        id: "ep-2",
        tenantId: "user-1",
        name: "Endpoint 2",
        nextRunAt: new Date(),
        failureCount: 0,
      };

      const mockHealth = {
        successCount: 10,
        failureCount: 0,
        avgDurationMs: 100.0,
        lastRun: null,
        failureStreak: 0,
      };

      // First endpoint throws error
      vi.mocked(mockJobsRepo.getEndpoint)
        .mockRejectedValueOnce(new Error("Database connection lost"))
        .mockResolvedValueOnce(mockEndpoint2);

      vi.mocked(mockRunsRepo.getHealthSummary).mockResolvedValue(mockHealth);
      vi.mocked(mockAIClient.planWithTools).mockResolvedValue({ text: "Analysis complete" });

      // Mock console.error to verify error logging
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => { });

      await planner.analyzeEndpoints(["ep-1", "ep-2"]);

      // Verify error was logged for first endpoint
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to analyze endpoint ep-1:",
        expect.any(Error),
      );

      // Verify second endpoint was still analyzed
      expect(mockJobsRepo.getEndpoint).toHaveBeenCalledWith("ep-2");
      expect(mockAIClient.planWithTools).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });

    it("handles empty endpoint array", async () => {
      await planner.analyzeEndpoints([]);

      expect(mockJobsRepo.getEndpoint).not.toHaveBeenCalled();
      expect(mockAIClient.planWithTools).not.toHaveBeenCalled();
    });
  });
});
