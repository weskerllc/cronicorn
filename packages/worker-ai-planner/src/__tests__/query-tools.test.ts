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

      mockRuns.getResponseHistory.mockResolvedValue(mockHistory);

      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

      const result = await callTool(tools, "get_response_history", {});

      expect(mockRuns.getResponseHistory).toHaveBeenCalledWith(endpointId, 10);
      expect(result).toEqual({
        count: 2,
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
      mockRuns.getResponseHistory.mockResolvedValue([]);

      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

      await callTool(tools, "get_response_history", { limit: 25 });

      expect(mockRuns.getResponseHistory).toHaveBeenCalledWith(endpointId, 25);
    });

    it("should return empty message when no history exists", async () => {
      mockRuns.getResponseHistory.mockResolvedValue([]);

      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

      const result = await callTool(tools, "get_response_history", { limit: 10 });

      expect(result).toEqual({
        count: 0,
        message: "No execution history found for this endpoint",
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

      mockRuns.getResponseHistory.mockResolvedValue(mockHistory);

      const tools = createToolsForEndpoint(endpointId, jobId, {
        // @ts-expect-error Partial mock for testing
        jobs: mockJobs,
        // @ts-expect-error Partial mock for testing
        runs: mockRuns,
        clock: mockClock,
      });

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
