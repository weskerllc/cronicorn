/**
 * POST /endpoints/:id/reset-failures - Reset failure count
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// Define schemas once, get both validator and MCP shape
const [ResetFailuresRequestSchema, resetFailuresInputShape] = createSchemaAndShape({
  id: z.string().describe("Endpoint ID"),
});

// No response body for 204 No Content
const [EmptyResponseSchema, emptyResponseShape] = createSchemaAndShape({});

export function registerPostResetFailures(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "POST_endpoints_id_reset_failures",
    title: "Reset Failure Count",
    description: "Reset the failure count for an endpoint to zero. Useful after fixing an issue or to clear accumulated failures that may trigger alerts or backoff behavior.",
    inputSchema: resetFailuresInputShape,
    outputSchema: emptyResponseShape,
    inputValidator: ResetFailuresRequestSchema,
    outputValidator: EmptyResponseSchema,
    method: "POST",
    path: input => `/endpoints/${input.id}/reset-failures`,
    successMessage: () => `✅ Failure count reset successfully`,
  });
}
