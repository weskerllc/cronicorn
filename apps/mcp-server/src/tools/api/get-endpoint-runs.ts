/**
 * GET /endpoints/:id/runs - List run history for an endpoint
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { ListRunsResponse, RunSummaryResponse } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// Define schemas once, get both validator and MCP shape
const [ListRunsRequestSchema, listRunsInputShape] = createSchemaAndShape({
  id: z.string().describe("Endpoint ID"),
  endpointId: z.string().optional().describe("Filter by endpoint ID"),
  status: z.enum(["success", "failed"]).optional().describe("Filter by run status"),
  limit: z.number().int().positive().optional().describe("Maximum number of runs to return"),
  offset: z.number().int().nonnegative().optional().describe("Number of runs to skip"),
});

const [RunSummaryResponseSchema, _runSummaryShape] = createSchemaAndShape({
  runId: z.string(),
  endpointId: z.string(),
  startedAt: z.string().datetime(),
  status: z.string(),
  durationMs: z.number().optional(),
  source: z.string().optional(),
});

const [ListRunsResponseSchema, listRunsResponseShape] = createSchemaAndShape({
  runs: z.array(RunSummaryResponseSchema),
  total: z.number().int(),
});

// Type assertions to ensure compatibility with API contracts
const _itemCheck: z.ZodType<RunSummaryResponse> = RunSummaryResponseSchema;
const _outputCheck: z.ZodType<ListRunsResponse> = ListRunsResponseSchema;

export function registerGetEndpointRuns(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "GET_endpoints_id_runs",
    title: "List Endpoint Runs",
    description: "List run history for an endpoint. Supports filtering by status and pagination with limit/offset. Returns run summaries with execution details.",
    inputSchema: listRunsInputShape,
    outputSchema: listRunsResponseShape,
    inputValidator: ListRunsRequestSchema,
    outputValidator: ListRunsResponseSchema,
    method: "GET",
    path: input => `/endpoints/${input.id}/runs`,
    successMessage: result => `✅ Found ${result.runs.length} run(s) (${result.total} total)`,
  });
}
