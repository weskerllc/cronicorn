/**
 * DELETE /jobs/:jobId/endpoints/:id - Delete an endpoint
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Simple DELETE request with jobId and id
const DeleteEndpointRequestSchema = z.object({
  jobId: z.string().describe("Parent job ID"),
  id: z.string().describe("Endpoint ID to delete"),
});

// Empty response for 204 No Content
const EmptyResponseSchema = z.object({});

export function registerDeleteEndpoint(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "DELETE_jobs_jobId_endpoints_id",
    title: "Delete Endpoint",
    description: "Permanently delete an endpoint. This action cannot be undone. All associated run history will be deleted.",
    inputSchema: toShape(DeleteEndpointRequestSchema),
    outputSchema: toShape(EmptyResponseSchema),
    inputValidator: DeleteEndpointRequestSchema,
    outputValidator: EmptyResponseSchema,
    method: "DELETE",
    path: input => `/jobs/${input.jobId}/endpoints/${input.id}`,
    successMessage: () => `✅ Endpoint deleted successfully`,
  });
}
