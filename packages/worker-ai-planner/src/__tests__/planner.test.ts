import type { AIClient, Clock, JobEndpoint, JobsRepo, QuotaGuard, RunsRepo, SessionsRepo } from "@cronicorn/domain";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlannerLogger } from "../planner.js";

import { AIPlanner } from "../planner.js";

// Helper to create multi-window health mock
function createMultiWindowHealth(overrides?: Partial<{
  hour1: { successCount: number; failureCount: number; successRate: number };
  hour4: { successCount: number; failureCount: number; successRate: number };
  hour24: { successCount: number; failureCount: number; successRate: number };
  avgDurationMs: number | null;
  failureStreak: number;
}>) {
  return {
    hour1: { successCount: 10, failureCount: 0, successRate: 100, ...overrides?.hour1 },
    hour4: { successCount: 30, failureCount: 2, successRate: 94, ...overrides?.hour4 },
    hour24: { successCount: 42, failureCount: 3, successRate: 93, ...overrides?.hour24 },
    avgDurationMs: overrides?.avgDurationMs ?? 150.5,
    failureStreak: overrides?.failureStreak ?? 0,
  };
}

describe("aiPlanner", () => {
  let mockJobsRepo: JobsRepo;
  let mockRunsRepo: RunsRepo;
  let mockSessionsRepo: SessionsRepo;
  let mockQuotaGuard: QuotaGuard;
  let mockAIClient: AIClient;
  let fakeClock: Clock;
  let mockLogger: PlannerLogger;
  let planner: AIPlanner;

  beforeEach(() => {
    const now = new Date("2025-10-15T12:00:00Z");
    fakeClock = {
      now: () => now,
      sleep: async () => { },
    };

    mockJobsRepo = {
      getUserTier: vi.fn(),
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
      countEndpointsByUser: vi.fn(),
      claimDueEndpoints: vi.fn(),
      setLock: vi.fn(),
      clearLock: vi.fn(),
      clearAIHints: vi.fn(),
      resetFailureCount: vi.fn(),
      updateAfterRun: vi.fn(),
    };

    mockRunsRepo = {
      getHealthSummary: vi.fn(),
      getHealthSummaryMultiWindow: vi.fn(),
      // Add other required methods as stubs
      create: vi.fn(),
      finish: vi.fn(),
      listRuns: vi.fn(),
      getRunDetails: vi.fn(),
      getEndpointsWithRecentRuns: vi.fn(),
      getLatestResponse: vi.fn(),
      getResponseHistory: vi.fn(),
      getSiblingLatestResponses: vi.fn(),
    };

    mockSessionsRepo = {
      create: vi.fn(),
      getRecentSessions: vi.fn().mockResolvedValue([]),
      getTotalTokenUsage: vi.fn(),
    };

    mockQuotaGuard = {
      canProceed: vi.fn().mockResolvedValue(true), // Default: allow all requests
      recordUsage: vi.fn(),
    };

    mockAIClient = {
      planWithTools: vi.fn().mockResolvedValue({
        toolCalls: [],
        reasoning: "AI analysis complete",
        tokenUsage: 100,
      }),
    };

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    planner = new AIPlanner({
      aiClient: mockAIClient,
      jobs: mockJobsRepo,
      runs: mockRunsRepo,
      sessions: mockSessionsRepo,
      quota: mockQuotaGuard,
      clock: fakeClock,
      logger: mockLogger,
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

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockRunsRepo.getHealthSummaryMultiWindow).mockResolvedValue(createMultiWindowHealth());
      vi.mocked(mockAIClient.planWithTools).mockResolvedValue({ toolCalls: [], reasoning: "Analysis complete", tokenUsage: 100 });

      await planner.analyzeEndpoint("ep-1");

      // Verify endpoint fetch
      expect(mockJobsRepo.getEndpoint).toHaveBeenCalledWith("ep-1");

      // Verify multi-window health summary fetch
      expect(mockRunsRepo.getHealthSummaryMultiWindow).toHaveBeenCalledWith("ep-1", fakeClock.now());

      // Verify AI invocation
      expect(mockAIClient.planWithTools).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.stringContaining("Health Check"),
          tools: expect.any(Object),
          maxTokens: 8192,
        }),
      );
    });

    it("builds prompt with endpoint, health data, and sibling names", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        jobId: "job-1",
        tenantId: "user-1",
        name: "API Monitor",
        baselineCron: "0 9 * * 1", // Monday at 9 AM
        lastRunAt: new Date("2025-10-14T09:00:00Z"),
        nextRunAt: new Date("2025-10-21T09:00:00Z"),
        failureCount: 5,
      };

      const mockHealth = createMultiWindowHealth({
        hour1: { successCount: 2, failureCount: 3, successRate: 40 },
        hour4: { successCount: 5, failureCount: 10, successRate: 33 },
        hour24: { successCount: 10, failureCount: 15, successRate: 40 },
        avgDurationMs: 2500.0,
        failureStreak: 3,
      });

      const siblingEndpoints: JobEndpoint[] = [
        { id: "ep-2", jobId: "job-1", tenantId: "user-1", name: "Data Fetcher", nextRunAt: new Date(), failureCount: 0 },
        { id: "ep-3", jobId: "job-1", tenantId: "user-1", name: "Notifier", nextRunAt: new Date(), failureCount: 0 },
      ];

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockJobsRepo.getJob).mockResolvedValue({ id: "job-1", name: "My Job", userId: "user-1", status: "active", createdAt: new Date(), updatedAt: new Date() });
      vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue([mockEndpoint, ...siblingEndpoints]);
      vi.mocked(mockRunsRepo.getHealthSummaryMultiWindow).mockResolvedValue(mockHealth);
      vi.mocked(mockAIClient.planWithTools).mockResolvedValue({ toolCalls: [], reasoning: "Analysis complete", tokenUsage: 100 });

      await planner.analyzeEndpoint("ep-1");

      const aiCall = vi.mocked(mockAIClient.planWithTools).mock.calls[0][0];
      const prompt = aiCall.input;

      // Verify prompt contains endpoint data
      expect(prompt).toContain("API Monitor");
      expect(prompt).toContain("0 9 * * 1");
      expect(prompt).toContain("Failure Count: 5");

      // Verify prompt contains multi-window health metrics (lean prompt format)
      expect(prompt).toContain("| 1h  | 40%");
      expect(prompt).toContain("| 4h  | 33%");
      expect(prompt).toContain("| 24h | 40%");
      expect(prompt).toContain("Avg duration: 2500ms");
      expect(prompt).toContain("Failure streak: 3");

      // Verify prompt contains sibling endpoint names (lean prompt: Job: X endpoints)
      expect(prompt).toContain("**Job:**");
      expect(prompt).toContain("3 endpoints");
      expect(prompt).toContain("API Monitor");
      expect(prompt).toContain("Data Fetcher");
      expect(prompt).toContain("Notifier");
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

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockRunsRepo.getHealthSummaryMultiWindow).mockResolvedValue(createMultiWindowHealth());
      vi.mocked(mockAIClient.planWithTools).mockResolvedValue({ toolCalls: [], reasoning: "Analysis complete", tokenUsage: 100 });

      await planner.analyzeEndpoint("ep-1");

      const aiCall = vi.mocked(mockAIClient.planWithTools).mock.calls[0][0];
      const tools = aiCall.tools;

      // Verify tools object structure
      expect(tools).toHaveProperty("propose_interval");
      expect(tools).toHaveProperty("propose_next_time");
      expect(tools).toHaveProperty("pause_until");
    });

    it("skips analysis when quota exceeded", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "Test Endpoint",
        baselineIntervalMs: 60_000,
        nextRunAt: new Date(),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockQuotaGuard.canProceed).mockResolvedValue(false);

      await planner.analyzeEndpoint("ep-1");

      // Verify quota was checked
      expect(mockQuotaGuard.canProceed).toHaveBeenCalledWith("user-1");

      // Verify AI was NOT called
      expect(mockAIClient.planWithTools).not.toHaveBeenCalled();
      expect(mockSessionsRepo.create).not.toHaveBeenCalled();

      // Verify warning was logged via injected logger
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Quota exceeded"),
      );
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

      vi.mocked(mockJobsRepo.getEndpoint)
        .mockResolvedValueOnce(mockEndpoint1)
        .mockResolvedValueOnce(mockEndpoint2);
      vi.mocked(mockRunsRepo.getHealthSummaryMultiWindow).mockResolvedValue(createMultiWindowHealth());
      vi.mocked(mockAIClient.planWithTools).mockResolvedValue({ toolCalls: [], reasoning: "Analysis complete", tokenUsage: 100 });

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

      // First endpoint throws error
      vi.mocked(mockJobsRepo.getEndpoint)
        .mockRejectedValueOnce(new Error("Database connection lost"))
        .mockResolvedValueOnce(mockEndpoint2);

      vi.mocked(mockRunsRepo.getHealthSummaryMultiWindow).mockResolvedValue(createMultiWindowHealth());
      vi.mocked(mockAIClient.planWithTools).mockResolvedValue({ toolCalls: [], reasoning: "Analysis complete", tokenUsage: 100 });

      await planner.analyzeEndpoints(["ep-1", "ep-2"]);

      // Verify error was logged via injected logger for first endpoint
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to analyze endpoint ep-1",
        expect.objectContaining({ error: "Database connection lost" }),
      );

      // Verify second endpoint was still analyzed
      expect(mockJobsRepo.getEndpoint).toHaveBeenCalledWith("ep-2");
      expect(mockAIClient.planWithTools).toHaveBeenCalledTimes(1);
    });

    it("handles empty endpoint array", async () => {
      await planner.analyzeEndpoints([]);

      expect(mockJobsRepo.getEndpoint).not.toHaveBeenCalled();
      expect(mockAIClient.planWithTools).not.toHaveBeenCalled();
    });
  });
});
