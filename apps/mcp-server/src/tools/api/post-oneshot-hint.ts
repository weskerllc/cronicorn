/**
 * POST /endpoints/:id/hints/oneshot - Schedule one-shot run
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { base as jobsBase } from "@cronicorn/api-contracts/jobs";
import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Extend base schema to include id for MCP tool input
const ScheduleOneShotRequestSchema = jobsBase.ScheduleOneShotRequestBaseSchema.and(z.object({
  id: z.string().describe("Endpoint ID"),
}));

// Empty response for 204 No Content
const EmptyResponseSchema = z.object({});

export function registerPostOneShotHint(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "POST_endpoints_id_hints_oneshot",
    title: "Schedule One-Shot Run",
    description: "Schedule a one-time run at a specific time or after a delay. Provide either nextRunAt (ISO datetime) or nextRunInMs (delay in ms). Useful for immediate checks or scheduled interventions.",
    inputSchema: toShape(ScheduleOneShotRequestSchema),
    outputSchema: toShape(EmptyResponseSchema),
    inputValidator: ScheduleOneShotRequestSchema,
    outputValidator: EmptyResponseSchema,
    method: "POST",
    path: input => `/endpoints/${input.id}/hints/oneshot`,
    transformInput: (input) => {
      const { id, ...body } = input;
      return body;
    },
    successMessage: () => `✅ One-shot run scheduled successfully`,
  });
}
