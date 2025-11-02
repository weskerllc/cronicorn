/**
 * POST /endpoints/:id/hints/oneshot - Schedule one-shot run
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { ScheduleOneShotRequest } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// Define schemas once, get both validator and MCP shape
const [ScheduleOneShotRequestSchema, scheduleOneShotInputShape] = createSchemaAndShape({
    id: z.string().describe("Endpoint ID"),
    nextRunAt: z.string().datetime().optional().describe("ISO 8601 datetime for next run"),
    nextRunInMs: z.number().int().positive().optional().describe("Milliseconds from now for next run"),
    ttlMinutes: z.number().int().positive().optional().describe("Time-to-live for hint in minutes"),
    reason: z.string().optional().describe("Explanation for the one-shot schedule"),
});

// No response body for 204 No Content
const [EmptyResponseSchema, emptyResponseShape] = createSchemaAndShape({});

// Type assertions to ensure compatibility with API contracts
const _inputCheck: z.ZodType<ScheduleOneShotRequest & { id: string }> = ScheduleOneShotRequestSchema;

export function registerPostOneShotHint(server: McpServer, apiClient: ApiClient) {
    registerApiTool(server, apiClient, {
        name: "POST_endpoints_id_hints_oneshot",
        title: "Schedule One-Shot Run",
        description: "Schedule a one-time run at a specific time or after a delay. Provide either nextRunAt (ISO datetime) or nextRunInMs (delay in ms). Useful for immediate checks or scheduled interventions.",
        inputSchema: scheduleOneShotInputShape,
        outputSchema: emptyResponseShape,
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
