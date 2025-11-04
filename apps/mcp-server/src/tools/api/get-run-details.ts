/**
 * GET /runs/:id - Get detailed run information
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { base as jobsBase } from "@cronicorn/api-contracts/jobs";
import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Simple GET request with just an ID
const GetRunDetailsRequestSchema = z.object({
  id: z.string().describe("Run ID"),
});

const RunDetailsResponseSchema = jobsBase.RunDetailsResponseBaseSchema;

export function registerGetRunDetails(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "GET_runs_id",
    title: "Get Run Details",
    description: "Get detailed information about a specific run. Includes full execution details, error messages, response body (if available), status code, and endpoint context.",
    inputSchema: toShape(GetRunDetailsRequestSchema),
    outputSchema: toShape(RunDetailsResponseSchema),
    inputValidator: GetRunDetailsRequestSchema,
    outputValidator: RunDetailsResponseSchema,
    method: "GET",
    path: input => `/runs/${input.id}`,
    successMessage: run => `✅ Retrieved run ${run.id} (status: ${run.status})`,
  });
}
