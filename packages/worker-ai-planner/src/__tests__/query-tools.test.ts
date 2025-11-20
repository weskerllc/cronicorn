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

      // Mock both the main call and the hasMore check
      mockRuns.getResponseHistory
        .mockResolvedValueOnce(mockHistory) // Main call: limit=2, offset=0
        .mockResolvedValueOnce([]); // hasMore check: limit=1, offset=2

      const result = await callTool(tools, "get_response_history", {});

      expect(mockRuns.getResponseHistory).toHaveBeenCalledWith(endpointId, 2, 0);
      expect(mockRuns.getResponseHistory).toHaveBeenCalledWith(endpointId, 1, 2);
      expect(result).toMatchObject({
        count: 2,
        hasMore: false,
        pagination: {
          offset: 0,
          limit: 2,
        },
        responses: [
          {
            responseBody: { value: 100 },
            timestamp: "2025-01-15T11:50:00.000Z",
            status: "success",
            durationMs: 150,
          },
          {
            responseBody: { value: 95 },
            timestamp: "2025-01-15T11:40:00.000Z",
            status: "success",
            durationMs: 142,
          },
        ],
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

      // Mock empty results - this should only call getResponseHistory once
      // because when there are no results, hasMore check is skipped
      mockRuns.getResponseHistory.mockResolvedValueOnce([]);

      await callTool(tools, "get_response_history", { limit: 5 });

      expect(mockRuns.getResponseHistory).toHaveBeenCalledTimes(1);
      expect(mockRuns.getResponseHistory).toHaveBeenCalledWith(endpointId, 5, 0);
    });

    it("should support efficient pagination with offset", async () => {
      // Reset mocks to ensure clean state
      mockRuns.getResponseHistory.mockReset();

      // Mock responses for first call (newest 2)
      const firstBatch = Array.from({ length: 2 }, (_, i) => ({
        responseBody: { iteration: i + 1 },
        timestamp: new Date(`2025-01-15T${String(10 + i).padStart(2, "0")}:00:00Z`),
        status: "success",
        durationMs: 100 + i,
      }));

      // Mock hasMore check - returns one result when checking if more exist
      const hasMoreResult = [{
        responseBody: { iteration: 3 },
        timestamp: new Date(`2025-01-15T12:00:00Z`),
        status: "success",
        durationMs: 102,
      }];

      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

      // Setup mocks for first call and hasMore check
      mockRuns.getResponseHistory
        .mockResolvedValueOnce(firstBatch) // First call: limit=2, offset=0
        .mockResolvedValueOnce(hasMoreResult); // hasMore check: limit=1, offset=2

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
          { responseBody: { iteration: 1 } },
          { responseBody: { iteration: 2 } },
        ],
      });

      // Verify calls
      expect(mockRuns.getResponseHistory).toHaveBeenNthCalledWith(1, endpointId, 2, 0);
      expect(mockRuns.getResponseHistory).toHaveBeenNthCalledWith(2, endpointId, 1, 2);

      // Reset for second part of test
      mockRuns.getResponseHistory.mockReset();

      // Mock responses for second call (next 3 after offset 2)
      const secondBatch = Array.from({ length: 3 }, (_, i) => ({
        responseBody: { iteration: i + 3 },
        timestamp: new Date(`2025-01-15T${String(12 + i).padStart(2, "0")}:00:00Z`),
        status: "success",
        durationMs: 102 + i,
      }));

      // Setup mocks for second call
      mockRuns.getResponseHistory
        .mockResolvedValueOnce(secondBatch) // Second call: limit=3, offset=2
        .mockResolvedValueOnce([]); // hasMore check: limit=1, offset=5 (no more results)

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
          { responseBody: { iteration: 3 } },
          { responseBody: { iteration: 4 } },
          { responseBody: { iteration: 5 } },
        ],
      });

      // Verify second set of calls
      expect(mockRuns.getResponseHistory).toHaveBeenNthCalledWith(1, endpointId, 3, 2);
      expect(mockRuns.getResponseHistory).toHaveBeenNthCalledWith(2, endpointId, 1, 5);
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

      // Mock both the main call and the hasMore check
      mockRuns.getResponseHistory
        .mockResolvedValueOnce(mockHistory) // Main call: limit=3, offset=0
        .mockResolvedValueOnce([]); // hasMore check: limit=1, offset=3

      const result = await callTool(tools, "get_response_history", { limit: 3 });

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

      mockRuns.getResponseHistory
        .mockResolvedValueOnce(shortHistory)
        .mockResolvedValueOnce([]);

      const result1 = await callTool(tools, "get_response_history", { limit: 1 });

      // @ts-expect-error result is unknown
      expect(result1.tokenSavingNote).toBeUndefined();

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

      mockRuns.getResponseHistory
        .mockResolvedValueOnce(longHistory)
        .mockResolvedValueOnce([]);

      const result2 = await callTool(tools, "get_response_history", { limit: 1 });

      // @ts-expect-error result is unknown
      expect(result2.tokenSavingNote).toBe("Response bodies truncated at 1000 chars to prevent token overflow");
      // @ts-expect-error result is unknown
      expect(result2.responses[0].responseBody).toContain("...[truncated]");
    });
  });

  describe("get_sibling_latest_responses", () => {
    it("should return sibling responses when available", async () => {
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

      mockRuns.getSiblingLatestResponses.mockResolvedValue(mockSiblings);

      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

      const result = await callTool(tools, "get_sibling_latest_responses", {});

      expect(mockRuns.getSiblingLatestResponses).toHaveBeenCalledWith(jobId, endpointId);
      expect(result).toMatchObject({
        count: 2,
        siblings: [
          {
            endpointId: "ep_sibling_1",
            endpointName: "ETL Extract",
            responseBody: { rowsExtracted: 1000 },
            timestamp: "2025-01-15T11:55:00.000Z",
            status: "success",
          },
          {
            endpointId: "ep_sibling_2",
            endpointName: "ETL Transform",
            responseBody: { rowsTransformed: 1000 },
            timestamp: "2025-01-15T11:56:00.000Z",
            status: "success",
          },
        ],
      });
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

      const result = await callTool(tools, "get_sibling_latest_responses", {});

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

      mockRuns.getSiblingLatestResponses.mockResolvedValue(mockSiblings);

      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

      const result = await callTool(tools, "get_sibling_latest_responses", {});

      // @ts-expect-error result is unknown from callTool helper
      expect(result.count).toBe(1);
      // @ts-expect-error siblings exists on result
      expect(result.siblings[0].responseBody).toBeNull();
      // @ts-expect-error siblings exists on result
      expect(result.siblings[0].status).toBe("failed");
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
