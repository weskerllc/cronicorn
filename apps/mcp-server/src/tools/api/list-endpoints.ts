/**
 * GET /jobs/:jobId/endpoints - List all endpoints for a job
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { EndpointResponse } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// Define schemas once, get both validator and MCP shape
const [ListEndpointsRequestSchema, listEndpointsInputShape] = createSchemaAndShape({
  jobId: z.string().describe("Parent job ID"),
});

const [EndpointResponseSchema, _endpointResponseShape] = createSchemaAndShape({
  id: z.string(),
  jobId: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  baselineCron: z.string().optional(),
  baselineIntervalMs: z.number().optional(),
  minIntervalMs: z.number().optional(),
  maxIntervalMs: z.number().optional(),
  nextRunAt: z.string().datetime(),
  lastRunAt: z.string().datetime().optional(),
  failureCount: z.number().int(),
  pausedUntil: z.string().datetime().optional(),
  url: z.string().optional(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  headersJson: z.record(z.string(), z.string()).optional(),
  bodyJson: z.any().optional(),
  timeoutMs: z.number().optional(),
  maxExecutionTimeMs: z.number().optional(),
  maxResponseSizeKb: z.number().optional(),
  aiHintIntervalMs: z.number().int().optional(),
  aiHintNextRunAt: z.string().datetime().optional(),
  aiHintExpiresAt: z.string().datetime().optional(),
  aiHintReason: z.string().optional(),
});

const [ListEndpointsResponseSchema, listEndpointsResponseShape] = createSchemaAndShape({
  endpoints: z.array(EndpointResponseSchema),
});

// Type assertions to ensure compatibility with API contracts
const _itemCheck: z.ZodType<EndpointResponse> = EndpointResponseSchema;

export function registerListEndpoints(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "GET_jobs_jobId_endpoints",
    title: "List Endpoints",
    description: "List all endpoints for a specific job. Returns array of endpoint configurations with their current states.",
    inputSchema: listEndpointsInputShape,
    outputSchema: listEndpointsResponseShape,
    inputValidator: ListEndpointsRequestSchema,
    outputValidator: ListEndpointsResponseSchema,
    method: "GET",
    path: input => `/jobs/${input.jobId}/endpoints`,
    successMessage: result => `✅ Found ${result.endpoints.length} endpoint(s)`,
  });
}
