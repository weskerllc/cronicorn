/**
 * DELETE /endpoints/:id/hints - Clear all AI hints
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Simple DELETE request with just an ID
const DeleteHintsRequestSchema = z.object({
  id: z.string().describe("Endpoint ID"),
});

// Empty response for 204 No Content
const EmptyResponseSchema = z.object({});

export function registerDeleteHints(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "DELETE_endpoints_id_hints",
    title: "Clear AI Hints",
    description: "Clear all AI hints (interval and one-shot) for an endpoint. The endpoint will revert to its baseline schedule. Useful for resetting adaptive behavior.",
    inputSchema: toShape(DeleteHintsRequestSchema),
    outputSchema: toShape(EmptyResponseSchema),
    inputValidator: DeleteHintsRequestSchema,
    outputValidator: EmptyResponseSchema,
    method: "DELETE",
    path: input => `/endpoints/${input.id}/hints`,
    successMessage: () => `✅ AI hints cleared successfully`,
  });
}
