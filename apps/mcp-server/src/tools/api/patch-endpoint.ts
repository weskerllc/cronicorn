/**
 * PATCH /jobs/:jobId/endpoints/:id - Update an endpoint
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { base as jobsBase, UpdateEndpointDescription, UpdateEndpointSummary } from "@cronicorn/api-contracts/jobs";
import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Extend base schema to include jobId and id for MCP tool input
const PatchEndpointRequestSchema = jobsBase.UpdateEndpointRequestBaseSchema.and(z.object({
  jobId: z.string().describe("Parent job ID"),
  id: z.string().describe("Endpoint ID to update"),
}));

const EndpointResponseSchema = jobsBase.EndpointResponseBaseSchema;

export function registerPatchEndpoint(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "updateEndpoint",
    title: UpdateEndpointSummary,
    description: UpdateEndpointDescription,
    inputSchema: toShape(PatchEndpointRequestSchema),
    outputSchema: toShape(EndpointResponseSchema),
    inputValidator: PatchEndpointRequestSchema,
    outputValidator: EndpointResponseSchema,
    method: "PATCH",
    path: input => `/jobs/${input.jobId}/endpoints/${input.id}`,
    transformInput: (input) => {
      const { jobId, id, ...body } = input;
      return body;
    },
    successMessage: endpoint => `✅ Updated endpoint "${endpoint.name}" (ID: ${endpoint.id})`,
  });
}
