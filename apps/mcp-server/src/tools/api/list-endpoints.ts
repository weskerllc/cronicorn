/**
 * GET /jobs/:jobId/endpoints - List all endpoints for a job
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import { base as jobsBase } from "@cronicorn/api-contracts/jobs";
import type { EndpointResponse } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Simple GET request with just jobId
const ListEndpointsRequestSchema = z.object({
  jobId: z.string().describe("Parent job ID"),
});

const EndpointResponseSchema = jobsBase.EndpointResponseBaseSchema;

const ListEndpointsResponseSchema = z.object({
  endpoints: z.array(EndpointResponseSchema),
});

export function registerListEndpoints(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "GET_jobs_jobId_endpoints",
    title: "List Endpoints",
    description: "List all endpoints for a job. Returns complete endpoint configurations including schedules, AI hints, and execution settings.",
    inputSchema: toShape(ListEndpointsRequestSchema),
    outputSchema: toShape(ListEndpointsResponseSchema),
    inputValidator: ListEndpointsRequestSchema,
    outputValidator: ListEndpointsResponseSchema,
    method: "GET",
    path: input => `/jobs/${input.jobId}/endpoints`,
    successMessage: result => `✅ Found ${result.endpoints.length} endpoint(s)`,
  });
}
