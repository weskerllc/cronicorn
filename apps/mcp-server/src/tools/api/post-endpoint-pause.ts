/**
 * POST /endpoints/:id/pause - Pause or resume an endpoint
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { base as jobsBase } from "@cronicorn/api-contracts/jobs";
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
    name: "POST_endpoints_id_pause",
    title: "Pause/Resume Endpoint",
    description: "Pause an endpoint until a specific time or resume it immediately. Set pausedUntil to an ISO datetime to pause, or null to resume. Useful for maintenance windows or temporary disabling.",
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
