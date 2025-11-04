/**
 * GET /endpoints/:id/health - Get endpoint health summary
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import { base as jobsBase } from "@cronicorn/api-contracts/jobs";
import type { HealthSummaryResponse } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Extend base schema to include id for MCP tool input
const HealthSummaryRequestSchema = jobsBase.HealthSummaryQueryBaseSchema.and(z.object({
  id: z.string().describe("Endpoint ID"),
}));

const HealthSummaryResponseSchema = jobsBase.HealthSummaryResponseBaseSchema;

export function registerGetEndpointHealth(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "GET_endpoints_id_health",
    title: "Get Endpoint Health",
    description: "Get health summary for an endpoint. Returns success/failure counts, average duration, last run info, and current failure streak. Useful for monitoring and alerting.",
    inputSchema: toShape(HealthSummaryRequestSchema),
    outputSchema: toShape(HealthSummaryResponseSchema),
    inputValidator: HealthSummaryRequestSchema,
    outputValidator: HealthSummaryResponseSchema,
    method: "GET",
    path: input => `/endpoints/${input.id}/health`,
    successMessage: health =>
      `✅ Health: ${health.successCount} successes, ${health.failureCount} failures, ${health.failureStreak} failure streak`,
  });
}
