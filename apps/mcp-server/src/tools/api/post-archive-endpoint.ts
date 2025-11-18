/**
 * POST /jobs/:jobId/endpoints/:id/archive - Archive an endpoint
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ArchiveEndpointDescription, ArchiveEndpointSummary, EndpointResponseSchema } from "@cronicorn/api-contracts/jobs";
import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// POST /jobs/:jobId/endpoints/:id/archive
const ArchiveEndpointRequestSchema = z.object({
  jobId: z.string().describe("Parent job ID"),
  id: z.string().describe("Endpoint ID to archive"),
});

export function registerArchiveEndpoint(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "archiveEndpoint",
    title: ArchiveEndpointSummary,
    description: ArchiveEndpointDescription,
    inputSchema: toShape(ArchiveEndpointRequestSchema),
    outputSchema: toShape(EndpointResponseSchema),
    inputValidator: ArchiveEndpointRequestSchema,
    outputValidator: EndpointResponseSchema,
    method: "POST",
    path: input => `/jobs/${input.jobId}/endpoints/${input.id}/archive`,
    successMessage: output => `✅ Endpoint archived: ${output.name}`,
  });
}
