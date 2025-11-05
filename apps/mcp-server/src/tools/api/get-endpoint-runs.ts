/**
 * GET /endpoints/:id/runs - List run history for an endpoint
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { base as jobsBase, ListRunsDescription, ListRunsSummary } from "@cronicorn/api-contracts/jobs";
import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Extend base schema to include id for MCP tool input
const ListRunsRequestSchema = jobsBase.ListRunsQueryBaseSchema.and(z.object({
  id: z.string().describe("Endpoint ID"),
}));

const RunSummaryResponseSchema = jobsBase.RunSummaryResponseBaseSchema;

const ListRunsResponseSchema = z.object({
  runs: z.array(RunSummaryResponseSchema),
  total: z.number().int(),
});

export function registerGetEndpointRuns(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "listEndpointRuns",
    title: ListRunsSummary,
    description: ListRunsDescription,
    inputSchema: toShape(ListRunsRequestSchema),
    outputSchema: toShape(ListRunsResponseSchema),
    inputValidator: ListRunsRequestSchema,
    outputValidator: ListRunsResponseSchema,
    method: "GET",
    path: input => `/endpoints/${input.id}/runs`,
    successMessage: result => `✅ Found ${result.runs.length} run(s) (total: ${result.total})`,
  });
}
