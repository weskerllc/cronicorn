/**
 * Query Tools Unit Tests
 *
 * Tests the 3 query tools that retrieve response data for AI analysis.
 * Covers happy paths, edge cases, and error scenarios.
 */

import { callTool } from "@cronicorn/domain";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createToolsForEndpoint } from "../tools.js";

describe("query tools", () => {
  const endpointId = "ep_test_123";
  const jobId = "job_test_456";

  // Mock dependencies (partial mocks - only the methods we need)
  const mockJobs = {
    writeAIHint: vi.fn(),
    setNextRunAtIfEarlier: vi.fn(),
    setPausedUntil: vi.fn(),
    clearAIHints: vi.fn(),
    listEndpointsByJob: vi.fn(),
  };

  const mockRuns = {
    getLatestResponse: vi.fn(),
    getResponseHistory: vi.fn(),
    getSiblingLatestResponses: vi.fn(),
  };

  const mockClock = {
    now: () => new Date("2025-01-15T12:00:00Z"),
    sleep: async () => { },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("get_latest_response", () => {
    it("should return latest response when available", async () => {
      const mockResponse = {
        responseBody: { queueDepth: 42, status: "healthy" },
        timestamp: new Date("2025-01-15T11:30:00Z"),
        status: "success",
      };

      mockRuns.getLatestResponse.mockResolvedValue(mockResponse);

      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

      const result = await callTool(tools, "get_latest_response", {});

      expect(mockRuns.getLatestResponse).toHaveBeenCalledWith(endpointId);
      expect(result).toEqual({
        found: true,
        responseBody: { queueDepth: 42, status: "healthy" },
        timestamp: "2025-01-15T11:30:00.000Z",
        status: "success",
        tokenSavingNote: undefined,
      });
    });

    it("should return not found when no executions exist", async () => {
      mockRuns.getLatestResponse.mockResolvedValue(null);

      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

      const result = await callTool(tools, "get_latest_response", {});

      expect(mockRuns.getLatestResponse).toHaveBeenCalledWith(endpointId);
      expect(result).toEqual({
        found: false,
        message: "No executions found for this endpoint",
      });
    });

    it("should handle null responseBody", async () => {
      const mockResponse = {
        responseBody: null,
        timestamp: new Date("2025-01-15T11:30:00Z"),
        status: "failed",
      };

      mockRuns.getLatestResponse.mockResolvedValue(mockResponse);

      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

      const result = await callTool(tools, "get_latest_response", {});

      expect(result).toEqual({
        found: true,
        responseBody: null,
        timestamp: "2025-01-15T11:30:00.000Z",
        status: "failed",
        tokenSavingNote: undefined,
      });
    });
  });

  describe("get_response_history", () => {
    it("should return response history with default limit", async () => {
      const mockHistory = [
        {
          responseBody: { value: 100 },
          timestamp: new Date("2025-01-15T11:50:00Z"),
          status: "success",
          durationMs: 150,
        },
        {
          responseBody: { value: 95 },
          timestamp: new Date("2025-01-15T11:40:00Z"),
          status: "success",
          durationMs: 142,
        },
      ];

      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

      // Returns 2 items (< limit+1=6), so hasMore=false
      mockRuns.getResponseHistory.mockResolvedValueOnce(mockHistory);

      const result = await callTool(tools, "get_response_history", {});

      expect(mockRuns.getResponseHistory).toHaveBeenCalledWith(endpointId, 6, 0);
      expect(result).toMatchObject({
        count: 2,
        hasMore: false,
        pagination: {
          offset: 0,
          limit: 5,
        },
        responses: [
          {
            responseBody: undefined,
            responsePreview: "{\"value\":100}",
            timestamp: "2025-01-15T11:50:00.000Z",
            status: "success",
            durationMs: 150,
          },
          {
            responseBody: undefined,
            responsePreview: "{\"value\":95}",
            timestamp: "2025-01-15T11:40:00.000Z",
            status: "success",
            durationMs: 142,
          },
        ],
        tokenSavingNote: "Response bodies omitted by default. Set includeBodies=true only when necessary.",
      });
    });

    it("should respect custom limit parameter", async () => {
      // Reset mocks to ensure clean state
      mockRuns.getResponseHistory.mockReset();

      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

      // Mock empty results - single call with limit+1
      mockRuns.getResponseHistory.mockResolvedValueOnce([]);

      await callTool(tools, "get_response_history", { limit: 5 });

      expect(mockRuns.getResponseHistory).toHaveBeenCalledTimes(1);
      expect(mockRuns.getResponseHistory).toHaveBeenCalledWith(endpointId, 6, 0);
    });

    it("should support efficient pagination with offset", async () => {
      // Reset mocks to ensure clean state
      mockRuns.getResponseHistory.mockReset();

      // Mock responses for first call (newest 2 + 1 extra to signal hasMore)
      const firstBatch = Array.from({ length: 3 }, (_, i) => ({
        responseBody: { iteration: i + 1 },
        timestamp: new Date(`2025-01-15T${String(10 + i).padStart(2, "0")}:00:00Z`),
        status: "success",
        durationMs: 100 + i,
      }));

      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

      // Return limit+1 (3) items to signal hasMore=true
      mockRuns.getResponseHistory.mockResolvedValueOnce(firstBatch);

      // First call: get 2 newest responses
      const result1 = await callTool(tools, "get_response_history", { limit: 2 });

      expect(result1).toMatchObject({
        count: 2,
        hasMore: true,
        pagination: {
          offset: 0,
          limit: 2,
          nextOffset: 2,
        },
        responses: [
          { responseBody: undefined, responsePreview: "{\"iteration\":1}" },
          { responseBody: undefined, responsePreview: "{\"iteration\":2}" },
        ],
      });

      // Verify single call with limit+1
      expect(mockRuns.getResponseHistory).toHaveBeenNthCalledWith(1, endpointId, 3, 0);

      // Reset for second part of test
      mockRuns.getResponseHistory.mockReset();

      // Mock responses for second call (next 3 after offset 2, no extra = hasMore=false)
      const secondBatch = Array.from({ length: 3 }, (_, i) => ({
        responseBody: { iteration: i + 3 },
        timestamp: new Date(`2025-01-15T${String(12 + i).padStart(2, "0")}:00:00Z`),
        status: "success",
        durationMs: 102 + i,
      }));

      // Return exactly limit items (3 < limit+1=4), so hasMore=false
      mockRuns.getResponseHistory.mockResolvedValueOnce(secondBatch);

      // Second call: skip first 2, get next 3
      const result2 = await callTool(tools, "get_response_history", { limit: 3, offset: 2 });

      expect(result2).toMatchObject({
        count: 3,
        hasMore: false,
        pagination: {
          offset: 2,
          limit: 3,
          nextOffset: undefined,
        },
        responses: [
          { responseBody: undefined, responsePreview: "{\"iteration\":3}" },
          { responseBody: undefined, responsePreview: "{\"iteration\":4}" },
          { responseBody: undefined, responsePreview: "{\"iteration\":5}" },
        ],
      });

      // Verify single call with limit+1
      expect(mockRuns.getResponseHistory).toHaveBeenNthCalledWith(1, endpointId, 4, 2);
    });

    it("should return empty message when no history exists", async () => {
      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

      mockRuns.getResponseHistory.mockResolvedValue([]);

      const result = await callTool(tools, "get_response_history", { limit: 10 });

      expect(result).toEqual({
        count: 0,
        message: "No execution history found for this endpoint",
        hasMore: false,
        pagination: { offset: 0, limit: 10 },
      });
    });

    it("should handle mixed success/failure responses", async () => {
      const mockHistory = [
        {
          responseBody: { error: "timeout" },
          timestamp: new Date("2025-01-15T11:55:00Z"),
          status: "failed",
          durationMs: 5000,
        },
        {
          responseBody: { value: 100 },
          timestamp: new Date("2025-01-15T11:50:00Z"),
          status: "success",
          durationMs: 150,
        },
        {
          responseBody: null,
          timestamp: new Date("2025-01-15T11:45:00Z"),
          status: "failed",
          durationMs: 100,
        },
      ];

      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

      // Returns 3 items (< limit+1=4), so hasMore=false
      mockRuns.getResponseHistory.mockResolvedValueOnce(mockHistory);

      const result = await callTool(tools, "get_response_history", { limit: 3, includeBodies: true });

      // @ts-expect-error result is unknown from callTool helper
      expect(result.count).toBe(3);
      // @ts-expect-error responses exists on result
      expect(result.responses).toHaveLength(3);
      // @ts-expect-error responses exists on result
      expect(result.responses[0].status).toBe("failed");
      // @ts-expect-error responses exists on result
      expect(result.responses[1].status).toBe("success");
      // @ts-expect-error responses exists on result
      expect(result.responses[2].responseBody).toBeNull();
    });

    it("should only show tokenSavingNote when truncation actually occurred", async () => {
      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

      // Test 1: Short response bodies (< 1000 chars) - no truncation
      const shortHistory = [
        {
          responseBody: { status: "ok", count: 10 },
          timestamp: new Date("2025-01-15T11:50:00Z"),
          status: "success",
          durationMs: 150,
        },
      ];

      // Returns 1 item (< limit+1=2), so hasMore=false
      mockRuns.getResponseHistory.mockResolvedValueOnce(shortHistory);

      const result1 = await callTool(tools, "get_response_history", { limit: 1 });

      // @ts-expect-error result is unknown
      expect(result1.tokenSavingNote).toBe("Response bodies omitted by default. Set includeBodies=true only when necessary.");
      // @ts-expect-error result is unknown
      expect(result1.responses[0].responseBody).toBeUndefined();
      // @ts-expect-error result is unknown
      expect(result1.responses[0].responsePreview).toBe("{\"status\":\"ok\",\"count\":10}");

      // Test 2: Long response body (> 1000 chars) - truncation occurs
      const longBody = "x".repeat(1500); // 1500 character string
      const longHistory = [
        {
          responseBody: longBody,
          timestamp: new Date("2025-01-15T11:50:00Z"),
          status: "success",
          durationMs: 150,
        },
      ];

      // Returns 1 item (< limit+1=2), so hasMore=false
      mockRuns.getResponseHistory.mockResolvedValueOnce(longHistory);

      const result2 = await callTool(tools, "get_response_history", { limit: 1, includeBodies: true });

      // @ts-expect-error result is unknown
      expect(result2.tokenSavingNote).toBe("Response bodies truncated at 500 chars to prevent token overflow");
      // @ts-expect-error result is unknown
      expect(result2.responses[0].responseBody).toContain("...[truncated]");

      // Test 3: Include bodies without truncation - note should be undefined
      const mediumHistory = [
        {
          responseBody: { ok: true },
          timestamp: new Date("2025-01-15T11:45:00Z"),
          status: "success",
          durationMs: 120,
        },
      ];

      // Returns 1 item (< limit+1=2), so hasMore=false
      mockRuns.getResponseHistory.mockResolvedValueOnce(mediumHistory);

      const result3 = await callTool(tools, "get_response_history", { limit: 1, includeBodies: true });

      // @ts-expect-error result is unknown
      expect(result3.tokenSavingNote).toBeUndefined();
      // @ts-expect-error result is unknown
      expect(result3.responses[0].responseBody).toEqual({ ok: true });
    });
  });

  describe("get_sibling_latest_responses", () => {
    it("should return sibling responses with schedule and hints info when available", async () => {
      const mockSiblings = [
        {
          endpointId: "ep_sibling_1",
          endpointName: "ETL Extract",
          responseBody: { rowsExtracted: 1000 },
          timestamp: new Date("2025-01-15T11:55:00Z"),
          status: "success",
        },
        {
          endpointId: "ep_sibling_2",
          endpointName: "ETL Transform",
          responseBody: { rowsTransformed: 1000 },
          timestamp: new Date("2025-01-15T11:56:00Z"),
          status: "success",
        },
      ];

      // Mock endpoint data for enrichment
      const mockEndpoints = [
        {
          id: endpointId, // current endpoint (should be filtered out)
          name: "Current Endpoint",
          nextRunAt: new Date("2025-01-15T13:00:00Z"),
          failureCount: 0,
        },
        {
          id: "ep_sibling_1",
          name: "ETL Extract",
          baselineIntervalMs: 300000,
          nextRunAt: new Date("2025-01-15T12:30:00Z"),
          lastRunAt: new Date("2025-01-15T11:55:00Z"),
          failureCount: 0,
          pausedUntil: null,
          aiHintIntervalMs: 60000,
          aiHintExpiresAt: new Date("2025-01-15T13:00:00Z"), // active hint
          aiHintReason: "High load detected",
        },
        {
          id: "ep_sibling_2",
          name: "ETL Transform",
          baselineCron: "*/5 * * * *",
          nextRunAt: new Date("2025-01-15T12:05:00Z"),
          lastRunAt: new Date("2025-01-15T11:56:00Z"),
          failureCount: 2,
          pausedUntil: new Date("2025-01-15T14:00:00Z"), // paused
        },
      ];

      mockRuns.getSiblingLatestResponses.mockResolvedValue(mockSiblings);
      mockJobs.listEndpointsByJob.mockResolvedValue(mockEndpoints);

      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

      const result = await callTool(tools, "get_sibling_latest_responses", { includeResponses: true });

      expect(mockRuns.getSiblingLatestResponses).toHaveBeenCalledWith(jobId, endpointId);
      expect(mockJobs.listEndpointsByJob).toHaveBeenCalledWith(jobId);

      // @ts-expect-error result is unknown
      expect(result.count).toBe(2);

      // Check first sibling (with active AI hint)
      // @ts-expect-error result is unknown
      const sibling1 = result.siblings[0];
      expect(sibling1.endpointId).toBe("ep_sibling_1");
      expect(sibling1.schedule.baseline).toBe("300000ms");
      expect(sibling1.schedule.failureCount).toBe(0);
      expect(sibling1.schedule.isPaused).toBe(false);
      expect(sibling1.aiHints).not.toBeNull();
      expect(sibling1.aiHints.intervalMs).toBe(60000);
      expect(sibling1.aiHints.reason).toBe("High load detected");

      // Check second sibling (paused, no active hints)
      // @ts-expect-error result is unknown
      const sibling2 = result.siblings[1];
      expect(sibling2.endpointId).toBe("ep_sibling_2");
      expect(sibling2.schedule.baseline).toBe("*/5 * * * *");
      expect(sibling2.schedule.failureCount).toBe(2);
      expect(sibling2.schedule.isPaused).toBe(true);
      expect(sibling2.aiHints).toBeNull();
    });

    it("should return empty when no siblings exist", async () => {
      mockRuns.getSiblingLatestResponses.mockResolvedValue([]);

      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

      const result = await callTool(tools, "get_sibling_latest_responses", { includeResponses: true });

      expect(result).toEqual({
        count: 0,
        message: "No sibling endpoints found or no executions yet",
        siblings: [],
      });
    });

    it("should handle siblings with null response bodies", async () => {
      const mockSiblings = [
        {
          endpointId: "ep_sibling_1",
          endpointName: "Failed Job",
          responseBody: null,
          timestamp: new Date("2025-01-15T11:55:00Z"),
          status: "failed",
        },
      ];

      const mockEndpoints = [
        {
          id: "ep_sibling_1",
          name: "Failed Job",
          baselineIntervalMs: 60000,
          nextRunAt: new Date("2025-01-15T12:30:00Z"),
          failureCount: 3,
        },
      ];

      mockRuns.getSiblingLatestResponses.mockResolvedValue(mockSiblings);
      mockJobs.listEndpointsByJob.mockResolvedValue(mockEndpoints);

      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

      const result = await callTool(tools, "get_sibling_latest_responses", { includeResponses: true });

      // @ts-expect-error result is unknown from callTool helper
      expect(result.count).toBe(1);
      // @ts-expect-error siblings exists on result
      expect(result.siblings[0].responseBody).toBeNull();
      // @ts-expect-error siblings exists on result
      expect(result.siblings[0].status).toBe("failed");
      // @ts-expect-error siblings exists on result
      expect(result.siblings[0].schedule.failureCount).toBe(3);
    });

    it("should exclude current endpoint from results", async () => {
      // The repo method is responsible for excluding the current endpoint
      // This test verifies we pass the correct excludeEndpointId parameter
      mockRuns.getSiblingLatestResponses.mockResolvedValue([]);

      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

      await callTool(tools, "get_sibling_latest_responses", {});

      expect(mockRuns.getSiblingLatestResponses).toHaveBeenCalledWith(jobId, endpointId);
    });
  });
});
