/**
 * POST /endpoints/:id/hints/interval - Apply AI interval hint
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ApplyIntervalHintDescription, ApplyIntervalHintSummary, base as jobsBase } from "@cronicorn/api-contracts/jobs";
import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Extend base schema to include id for MCP tool input
const ApplyIntervalHintRequestSchema = jobsBase.ApplyIntervalHintRequestBaseSchema.and(z.object({
  id: z.string().describe("Endpoint ID"),
}));

// Empty response for 204 No Content
const EmptyResponseSchema = z.object({});

export function registerPostIntervalHint(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "applyIntervalHint",
    title: ApplyIntervalHintSummary,
    description: ApplyIntervalHintDescription,
    inputSchema: toShape(ApplyIntervalHintRequestSchema),
    outputSchema: toShape(EmptyResponseSchema),
    inputValidator: ApplyIntervalHintRequestSchema,
    outputValidator: EmptyResponseSchema,
    method: "POST",
    path: input => `/endpoints/${input.id}/hints/interval`,
    transformInput: (input) => {
      const { id, ...body } = input;
      return body;
    },
    successMessage: () => `✅ Interval hint applied successfully`,
  });
}
