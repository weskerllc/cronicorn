/**
 * GET /dashboard/stats - Get aggregated dashboard statistics
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { DashboardStatsResponse } from "@cronicorn/api-contracts/dashboard";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// Define schemas once, get both validator and MCP shape
const [DashboardStatsRequestSchema, dashboardStatsInputShape] = createSchemaAndShape({
  days: z.number().int().positive().max(30).optional().default(7).describe("Number of days for time-series data (max 30)"),
});

const [DashboardStatsResponseSchema, dashboardStatsResponseShape] = createSchemaAndShape({
  jobs: z.object({
    total: z.number().int().nonnegative(),
  }),
  endpoints: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    paused: z.number().int().nonnegative(),
  }),
  successRate: z.object({
    overall: z.number().min(0).max(100),
    trend: z.enum(["up", "down", "stable"]),
  }),
  recentActivity: z.object({
    runs24h: z.number().int().nonnegative(),
    success24h: z.number().int().nonnegative(),
    failure24h: z.number().int().nonnegative(),
  }),
  runTimeSeries: z.array(
    z.object({
      date: z.string(),
      success: z.number().int().nonnegative(),
      failure: z.number().int().nonnegative(),
    }),
  ),
  topEndpoints: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      jobName: z.string(),
      successRate: z.number().min(0).max(100),
      lastRunAt: z.string().datetime().nullable(),
      runCount: z.number().int().nonnegative(),
    }),
  ),
  recentRuns: z.array(
    z.object({
      id: z.string(),
      endpointId: z.string(),
      endpointName: z.string(),
      jobName: z.string(),
      status: z.string(),
      startedAt: z.string().datetime(),
      durationMs: z.number().int().nonnegative().nullable(),
      source: z.string().nullable(),
    }),
  ),
});

// Type assertions to ensure compatibility with API contracts
const _outputCheck: z.ZodType<DashboardStatsResponse> = DashboardStatsResponseSchema;

export function registerGetDashboardStats(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "GET_dashboard_stats",
    title: "Get Dashboard Statistics",
    description: "Get comprehensive dashboard statistics including job counts, endpoint stats, success rates, recent activity, time-series data, top endpoints, and recent runs. Useful for overview and monitoring.",
    inputSchema: dashboardStatsInputShape,
    outputSchema: dashboardStatsResponseShape,
    inputValidator: DashboardStatsRequestSchema,
    outputValidator: DashboardStatsResponseSchema,
    method: "GET",
    path: "/dashboard/stats",
    successMessage: stats =>
      `✅ Dashboard: ${stats.jobs.total} jobs, ${stats.endpoints.total} endpoints, ${stats.successRate.overall.toFixed(1)}% success rate`,
  });
}
