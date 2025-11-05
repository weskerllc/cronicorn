/**
 * POST /jobs/:jobId/endpoints - Add an endpoint to a job
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { AddEndpointDescription, AddEndpointSummary, base as jobsBase } from "@cronicorn/api-contracts/jobs";
import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Extend base schema to include jobId for MCP tool input
const AddEndpointRequestSchema = jobsBase.AddEndpointRequestBaseSchema.and(z.object({
  jobId: z.string().describe("Parent job ID"),
}));

const EndpointResponseSchema = jobsBase.EndpointResponseBaseSchema;

export function registerPostEndpoint(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "addEndpoint",
    title: AddEndpointSummary,
    description: AddEndpointDescription,
    inputSchema: toShape(AddEndpointRequestSchema),
    outputSchema: toShape(EndpointResponseSchema),
    inputValidator: AddEndpointRequestSchema,
    outputValidator: EndpointResponseSchema,
    method: "POST",
    path: input => `/jobs/${input.jobId}/endpoints`,
    transformInput: (input) => {
      const { jobId, ...body } = input;
      return body;
    },
    successMessage: endpoint => `✅ Created endpoint "${endpoint.name}" (ID: ${endpoint.id})`,
  });
}
