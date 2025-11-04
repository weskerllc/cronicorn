/**
 * GET /dashboard/stats - Get aggregated dashboard statistics
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { base as dashboardBase } from "@cronicorn/api-contracts/dashboard";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Use base schemas from api-contracts (no OpenAPI decorations)
const DashboardStatsRequestSchema = dashboardBase.DashboardStatsQueryBaseSchema;
const DashboardStatsResponseSchema = dashboardBase.DashboardStatsResponseBaseSchema;

export function registerGetDashboardStats(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "GET_dashboard_stats",
    title: "Get Dashboard Statistics",
    description: "Get comprehensive dashboard statistics including job counts, endpoint stats, success rates, recent activity, time-series data, top endpoints, and recent runs. Useful for overview and monitoring.",
    inputSchema: toShape(DashboardStatsRequestSchema),
    outputSchema: toShape(DashboardStatsResponseSchema),
    inputValidator: DashboardStatsRequestSchema,
    outputValidator: DashboardStatsResponseSchema,
    method: "GET",
    path: "/dashboard/stats",
    successMessage: stats =>
      `✅ Dashboard: ${stats.jobs.total} jobs, ${stats.endpoints.total} endpoints, ${stats.successRate.overall.toFixed(1)}% success rate`,
  });
}
