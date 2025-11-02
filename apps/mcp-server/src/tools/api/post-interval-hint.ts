/**
 * POST /endpoints/:id/hints/interval - Apply AI interval hint
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { ApplyIntervalHintRequest } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// Define schemas once, get both validator and MCP shape
const [ApplyIntervalHintRequestSchema, applyIntervalHintInputShape] = createSchemaAndShape({
    id: z.string().describe("Endpoint ID"),
    intervalMs: z.number().int().positive().describe("AI-suggested interval in milliseconds"),
    ttlMinutes: z.number().int().positive().optional().describe("Time-to-live for hint in minutes"),
    reason: z.string().optional().describe("Explanation for the interval adjustment"),
});

// No response body for 204 No Content
const [EmptyResponseSchema, emptyResponseShape] = createSchemaAndShape({});

// Type assertions to ensure compatibility with API contracts
const _inputCheck: z.ZodType<ApplyIntervalHintRequest & { id: string }> = ApplyIntervalHintRequestSchema;

export function registerPostIntervalHint(server: McpServer, apiClient: ApiClient) {
    registerApiTool(server, apiClient, {
        name: "POST_endpoints_id_hints_interval",
        title: "Apply Interval Hint",
        description: "Apply an AI-suggested interval adjustment to an endpoint. The hint will override the baseline schedule until it expires. Useful for dynamic scaling based on traffic patterns, errors, or other signals.",
        inputSchema: applyIntervalHintInputShape,
        outputSchema: emptyResponseShape,
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
