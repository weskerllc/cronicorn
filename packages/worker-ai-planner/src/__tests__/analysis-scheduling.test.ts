/**
 * Tests for AI-Controlled Analysis Frequency (Task 1.2)
 *
 * These tests verify that:
 * 1. submit_analysis tool accepts and returns next_analysis_in_ms
 * 2. Planner stores nextAnalysisAt and endpointFailureCount in session
 * 3. The analysis scheduling logic works correctly
 */

import type { AIClient, Clock, JobEndpoint, JobsRepo, QuotaGuard, RunsRepo, SessionsRepo } from "@cronicorn/domain";

import { callTool } from "@cronicorn/domain";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AIPlanner } from "../planner.js";
import { createToolsForEndpoint } from "../tools.js";

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
    hour24: { successCount: 100, failureCount: 0, successRate: 100, ...overrides?.hour24 },
    avgDurationMs: overrides?.avgDurationMs ?? 50.0,
    failureStreak: overrides?.failureStreak ?? 0,
  };
}

describe("ai-controlled analysis scheduling", () => {
  let mockJobsRepo: JobsRepo;
  let mockRunsRepo: RunsRepo;
  let mockSessionsRepo: SessionsRepo;
  let mockQuotaGuard: QuotaGuard;
  let mockAIClient: AIClient;
  let fakeClock: Clock;
  let now: Date;

  beforeEach(() => {
    now = new Date("2025-10-15T12:00:00Z");
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
      getJob: vi.fn(),
      createJob: vi.fn(),
      listJobs: vi.fn(),
      updateJob: vi.fn(),
      archiveJob: vi.fn(),
      pauseJob: vi.fn(),
      resumeJob: vi.fn(),
      addEndpoint: vi.fn(),
      updateEndpoint: vi.fn(),
      listEndpointsByJob: vi.fn(),
      deleteEndpoint: vi.fn(),
      archiveEndpoint: vi.fn(),
      countEndpointsByUser: vi.fn(),
      claimDueEndpoints: vi.fn(),
      setLock: vi.fn(),
      clearLock: vi.fn(),
      clearAIHints: vi.fn(),
      resetFailureCount: vi.fn(),
      updateAfterRun: vi.fn(),
      getEndpointCounts: vi.fn(),
      getUserById: vi.fn(),
      getUserByStripeCustomerId: vi.fn(),
      updateUserSubscription: vi.fn(),
      getUsage: vi.fn(),
    };

    mockRunsRepo = {
      getHealthSummary: vi.fn(),
      getHealthSummaryMultiWindow: vi.fn(),
      create: vi.fn(),
      finish: vi.fn(),
      listRuns: vi.fn(),
      getRunDetails: vi.fn(),
      getEndpointsWithRecentRuns: vi.fn(),
      getLatestResponse: vi.fn(),
      getResponseHistory: vi.fn(),
      getSiblingLatestResponses: vi.fn(),
      getJobHealthDistribution: vi.fn(),
      getFilteredMetrics: vi.fn(),
      getSourceDistribution: vi.fn(),
      getRunTimeSeries: vi.fn(),
      getEndpointTimeSeries: vi.fn(),
      cleanupZombieRuns: vi.fn(),
    };

    mockSessionsRepo = {
      create: vi.fn().mockResolvedValue("session-1"),
      getLastSession: vi.fn(),
      getRecentSessions: vi.fn().mockResolvedValue([]),
      getTotalSessionCount: vi.fn(),
      getTotalTokenUsage: vi.fn(),
      getAISessionTimeSeries: vi.fn(),
    };

    mockQuotaGuard = {
      canProceed: vi.fn().mockResolvedValue(true),
      recordUsage: vi.fn(),
    };

    mockAIClient = {
      planWithTools: vi.fn(),
    };
  });

  describe("submit_analysis tool", () => {
    it("accepts and returns next_analysis_in_ms parameter", async () => {
      const tools = createToolsForEndpoint("ep-1", "job-1", {
        jobs: mockJobsRepo,
        runs: mockRunsRepo,
        clock: fakeClock,
      });

      const result = await callTool(tools, "submit_analysis", {
        reasoning: "Endpoint is stable, checking again in 2 hours",
        next_analysis_in_ms: 7200000, // 2 hours
        confidence: "high",
      });

      expect(result).toEqual({
        status: "analysis_complete",
        reasoning: "Endpoint is stable, checking again in 2 hours",
        actions_taken: [],
        confidence: "high",
        next_analysis_in_ms: 7200000,
      });
    });

    it("returns undefined for next_analysis_in_ms when not provided", async () => {
      const tools = createToolsForEndpoint("ep-1", "job-1", {
        jobs: mockJobsRepo,
        runs: mockRunsRepo,
        clock: fakeClock,
      });

      const result = await callTool(tools, "submit_analysis", {
        reasoning: "Standard analysis complete",
      });

      expect(result).toEqual({
        status: "analysis_complete",
        reasoning: "Standard analysis complete",
        actions_taken: [],
        confidence: "high",
        next_analysis_in_ms: undefined,
      });
    });

    it("accepts minimum interval (5 minutes)", async () => {
      const tools = createToolsForEndpoint("ep-1", "job-1", {
        jobs: mockJobsRepo,
        runs: mockRunsRepo,
        clock: fakeClock,
      });

      const result = await callTool(tools, "submit_analysis", {
        reasoning: "Incident active, checking frequently",
        next_analysis_in_ms: 300000, // 5 min minimum
      });

      expect(result.next_analysis_in_ms).toBe(300000);
    });

    it("accepts maximum interval (24 hours)", async () => {
      const tools = createToolsForEndpoint("ep-1", "job-1", {
        jobs: mockJobsRepo,
        runs: mockRunsRepo,
        clock: fakeClock,
      });

      const result = await callTool(tools, "submit_analysis", {
        reasoning: "Daily job, check tomorrow",
        next_analysis_in_ms: 86400000, // 24 hours max
      });

      expect(result.next_analysis_in_ms).toBe(86400000);
    });
  });

  describe("planner session storage", () => {
    it("stores nextAnalysisAt from AI response", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "Test Endpoint",
        baselineIntervalMs: 300000, // 5 min baseline
        nextRunAt: new Date("2025-10-15T13:00:00Z"),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockRunsRepo.getHealthSummaryMultiWindow).mockResolvedValue(createMultiWindowHealth());
      vi.mocked(mockAIClient.planWithTools).mockResolvedValue({
        toolCalls: [
          {
            tool: "submit_analysis",
            args: { reasoning: "All good", next_analysis_in_ms: 3600000 },
            result: {
              status: "analysis_complete",
              reasoning: "All good",
              actions_taken: [],
              confidence: "high",
              next_analysis_in_ms: 3600000, // 1 hour
            },
          },
        ],
        reasoning: "Analysis complete",
        tokenUsage: 100,
      });

      const planner = new AIPlanner({
        aiClient: mockAIClient,
        jobs: mockJobsRepo,
        runs: mockRunsRepo,
        sessions: mockSessionsRepo,
        quota: mockQuotaGuard,
        clock: fakeClock,
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      });

      await planner.analyzeEndpoint("ep-1");

      // Verify session was created with nextAnalysisAt
      expect(mockSessionsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          endpointId: "ep-1",
          nextAnalysisAt: new Date("2025-10-15T13:00:00Z"), // now + 1 hour
          endpointFailureCount: 0,
        }),
      );
    });

    it("uses baseline interval as default when AI doesn't specify next_analysis_in_ms", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "Test Endpoint",
        baselineIntervalMs: 600000, // 10 min baseline
        nextRunAt: new Date("2025-10-15T13:00:00Z"),
        failureCount: 2,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockRunsRepo.getHealthSummaryMultiWindow).mockResolvedValue(createMultiWindowHealth());
      vi.mocked(mockAIClient.planWithTools).mockResolvedValue({
        toolCalls: [
          {
            tool: "submit_analysis",
            args: { reasoning: "Stable" },
            result: {
              status: "analysis_complete",
              reasoning: "Stable",
              actions_taken: [],
              confidence: "high",
              // No next_analysis_in_ms
            },
          },
        ],
        reasoning: "Analysis complete",
        tokenUsage: 100,
      });

      const planner = new AIPlanner({
        aiClient: mockAIClient,
        jobs: mockJobsRepo,
        runs: mockRunsRepo,
        sessions: mockSessionsRepo,
        quota: mockQuotaGuard,
        clock: fakeClock,
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      });

      await planner.analyzeEndpoint("ep-1");

      // Verify session uses baseline interval (10 min)
      expect(mockSessionsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nextAnalysisAt: new Date("2025-10-15T12:10:00Z"), // now + 10 min baseline
          endpointFailureCount: 2,
        }),
      );
    });

    it("stores current endpoint failureCount as snapshot", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "Failing Endpoint",
        baselineIntervalMs: 300000,
        nextRunAt: new Date("2025-10-15T13:00:00Z"),
        failureCount: 5, // 5 consecutive failures
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockRunsRepo.getHealthSummaryMultiWindow).mockResolvedValue(
        createMultiWindowHealth({ failureStreak: 5, hour24: { successCount: 10, failureCount: 5, successRate: 67 } }),
      );
      vi.mocked(mockAIClient.planWithTools).mockResolvedValue({
        toolCalls: [
          {
            tool: "submit_analysis",
            args: { reasoning: "High failures" },
            result: { status: "analysis_complete", reasoning: "High failures" },
          },
        ],
        reasoning: "Analysis complete",
        tokenUsage: 100,
      });

      const planner = new AIPlanner({
        aiClient: mockAIClient,
        jobs: mockJobsRepo,
        runs: mockRunsRepo,
        sessions: mockSessionsRepo,
        quota: mockQuotaGuard,
        clock: fakeClock,
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      });

      await planner.analyzeEndpoint("ep-1");

      expect(mockSessionsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          endpointFailureCount: 5,
        }),
      );
    });

    it("defaults to 5 min when no baseline interval exists", async () => {
      const mockEndpoint: JobEndpoint = {
        id: "ep-1",
        tenantId: "user-1",
        name: "Cron-based Endpoint",
        baselineCron: "0 9 * * *", // No baselineIntervalMs
        nextRunAt: new Date("2025-10-15T13:00:00Z"),
        failureCount: 0,
      };

      vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);
      vi.mocked(mockRunsRepo.getHealthSummaryMultiWindow).mockResolvedValue(createMultiWindowHealth());
      vi.mocked(mockAIClient.planWithTools).mockResolvedValue({
        toolCalls: [
          {
            tool: "submit_analysis",
            args: { reasoning: "OK" },
            result: { status: "analysis_complete", reasoning: "OK" },
          },
        ],
        reasoning: "Analysis complete",
        tokenUsage: 100,
      });

      const planner = new AIPlanner({
        aiClient: mockAIClient,
        jobs: mockJobsRepo,
        runs: mockRunsRepo,
        sessions: mockSessionsRepo,
        quota: mockQuotaGuard,
        clock: fakeClock,
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      });

      await planner.analyzeEndpoint("ep-1");

      // Verify default 5 min interval is used
      expect(mockSessionsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nextAnalysisAt: new Date("2025-10-15T12:05:00Z"), // now + 5 min default
        }),
      );
    });
  });
});
