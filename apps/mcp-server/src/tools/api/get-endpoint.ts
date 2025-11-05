/**
 * GET /jobs/:jobId/endpoints/:id - Get an endpoint by ID
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { GetEndpointDescription, GetEndpointSummary, base as jobsBase } from "@cronicorn/api-contracts/jobs";
import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Simple GET request with job ID and endpoint ID
const GetEndpointRequestSchema = z.object({
  jobId: z.string().describe("Parent job ID"),
  id: z.string().describe("Endpoint ID"),
});

const EndpointResponseSchema = jobsBase.EndpointResponseBaseSchema;

export function registerGetEndpoint(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "getEndpoint",
    title: GetEndpointSummary,
    description: GetEndpointDescription,
    inputSchema: toShape(GetEndpointRequestSchema),
    outputSchema: toShape(EndpointResponseSchema),
    inputValidator: GetEndpointRequestSchema,
    outputValidator: EndpointResponseSchema,
    method: "GET",
    path: input => `/jobs/${input.jobId}/endpoints/${input.id}`,
    successMessage: endpoint => `✅ Retrieved endpoint "${endpoint.name}" (ID: ${endpoint.id})`,
  });
}
