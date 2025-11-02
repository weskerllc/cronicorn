/**
 * GET /runs/:id - Get detailed run information
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { RunDetailsResponse } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// Define schemas once, get both validator and MCP shape
const [GetRunDetailsRequestSchema, getRunDetailsInputShape] = createSchemaAndShape({
  id: z.string().describe("Run ID"),
});

const [RunDetailsResponseSchema, runDetailsResponseShape] = createSchemaAndShape({
  id: z.string(),
  endpointId: z.string(),
  status: z.string(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().optional(),
  durationMs: z.number().optional(),
  errorMessage: z.string().optional(),
  source: z.string().optional(),
  attempt: z.number().int(),
  responseBody: z.any().nullable().optional(),
  statusCode: z.number().int().optional(),
  endpoint: z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().optional(),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  }).optional(),
});

// Type assertions to ensure compatibility with API contracts
const _outputCheck: z.ZodType<RunDetailsResponse> = RunDetailsResponseSchema;

export function registerGetRunDetails(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "GET_runs_id",
    title: "Get Run Details",
    description: "Get detailed information about a specific run. Includes full execution details, error messages, response body (if available), status code, and endpoint context.",
    inputSchema: getRunDetailsInputShape,
    outputSchema: runDetailsResponseShape,
    inputValidator: GetRunDetailsRequestSchema,
    outputValidator: RunDetailsResponseSchema,
    method: "GET",
    path: input => `/runs/${input.id}`,
    successMessage: run => `✅ Retrieved run details (Status: ${run.status})`,
  });
}
