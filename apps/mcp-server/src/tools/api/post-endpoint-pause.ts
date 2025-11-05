/**
 * POST /endpoints/:id/pause - Pause or resume an endpoint
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { base as jobsBase, PauseResumeDescription, PauseResumeSummary } from "@cronicorn/api-contracts/jobs";
import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Extend base schema to include id for MCP tool input
const PauseResumeRequestSchema = jobsBase.PauseResumeRequestBaseSchema.and(z.object({
  id: z.string().describe("Endpoint ID"),
}));

// Empty response for 204 No Content
const EmptyResponseSchema = z.object({});

export function registerPostEndpointPause(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "pauseResumeEndpoint",
    title: PauseResumeSummary,
    description: PauseResumeDescription,
    inputSchema: toShape(PauseResumeRequestSchema),
    outputSchema: toShape(EmptyResponseSchema),
    inputValidator: PauseResumeRequestSchema,
    outputValidator: EmptyResponseSchema,
    method: "POST",
    path: input => `/endpoints/${input.id}/pause`,
    transformInput: (input) => {
      const { id, ...body } = input;
      return body;
    },
    successMessage: () => `✅ Endpoint pause/resume applied successfully`,
  });
}
