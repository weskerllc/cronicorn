/**
 * POST /endpoints/:id/test - Test endpoint
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { base as jobsBase, TestEndpointDescription, TestEndpointSummary } from "@cronicorn/api-contracts/jobs";
import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Input: just the endpoint ID
const TestEndpointInputSchema = z.object({
  id: z.string().describe("Endpoint ID to test"),
});

const TestEndpointResponseSchema = jobsBase.TestEndpointResponseBaseSchema;

export function registerPostTestEndpoint(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "testEndpoint",
    title: TestEndpointSummary,
    description: TestEndpointDescription,
    inputSchema: toShape(TestEndpointInputSchema),
    outputSchema: toShape(TestEndpointResponseSchema),
    inputValidator: TestEndpointInputSchema,
    outputValidator: TestEndpointResponseSchema,
    method: "POST",
    path: input => `/endpoints/${input.id}/test`,
    transformInput: () => ({}),
    successMessage: output =>
      output.status === "success"
        ? `✅ Endpoint test passed (${output.durationMs}ms, HTTP ${output.statusCode ?? "?"})`
        : `❌ Endpoint test failed: ${output.errorMessage ?? "unknown error"} (${output.durationMs}ms)`,
  });
}
