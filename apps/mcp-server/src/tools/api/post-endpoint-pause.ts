/**
 * POST /endpoints/:id/pause - Pause or resume an endpoint
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { PauseResumeRequest } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// Define schemas once, get both validator and MCP shape
const [PauseResumeRequestSchema, pauseResumeInputShape] = createSchemaAndShape({
    id: z.string().describe("Endpoint ID"),
    pausedUntil: z.string().datetime().nullable().describe("ISO datetime to pause until, or null to resume immediately"),
    reason: z.string().optional().describe("Explanation for pausing/resuming"),
});

// No response body for 204 No Content
const [EmptyResponseSchema, emptyResponseShape] = createSchemaAndShape({});

// Type assertions to ensure compatibility with API contracts
const _inputCheck: z.ZodType<PauseResumeRequest & { id: string }> = PauseResumeRequestSchema;

export function registerPostEndpointPause(server: McpServer, apiClient: ApiClient) {
    registerApiTool(server, apiClient, {
        name: "POST_endpoints_id_pause",
        title: "Pause/Resume Endpoint",
        description: "Pause an endpoint until a specific time or resume it immediately. Set pausedUntil to an ISO datetime to pause, or null to resume. Useful for maintenance windows or temporary disabling.",
        inputSchema: pauseResumeInputShape,
        outputSchema: emptyResponseShape,
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
