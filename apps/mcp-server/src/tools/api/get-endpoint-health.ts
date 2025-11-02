/**
 * GET /endpoints/:id/health - Get endpoint health summary
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { HealthSummaryResponse } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// Define schemas once, get both validator and MCP shape
const [HealthSummaryRequestSchema, healthSummaryInputShape] = createSchemaAndShape({
    id: z.string().describe("Endpoint ID"),
    sinceHours: z.number().int().positive().optional().describe("Look back period in hours"),
});

const [HealthSummaryResponseSchema, healthSummaryResponseShape] = createSchemaAndShape({
    successCount: z.number().int(),
    failureCount: z.number().int(),
    avgDurationMs: z.number().nullable(),
    lastRun: z.object({
        status: z.string(),
        at: z.string().datetime(),
    }).nullable(),
    failureStreak: z.number().int(),
});

// Type assertions to ensure compatibility with API contracts
const _outputCheck: z.ZodType<HealthSummaryResponse> = HealthSummaryResponseSchema;

export function registerGetEndpointHealth(server: McpServer, apiClient: ApiClient) {
    registerApiTool(server, apiClient, {
        name: "GET_endpoints_id_health",
        title: "Get Endpoint Health",
        description: "Get health summary for an endpoint. Returns success/failure counts, average duration, last run info, and current failure streak. Useful for monitoring and alerting.",
        inputSchema: healthSummaryInputShape,
        outputSchema: healthSummaryResponseShape,
        inputValidator: HealthSummaryRequestSchema,
        outputValidator: HealthSummaryResponseSchema,
        method: "GET",
        path: input => `/endpoints/${input.id}/health`,
        successMessage: health =>
            `✅ Health: ${health.successCount} successes, ${health.failureCount} failures, ${health.failureStreak} failure streak`,
    });
}
