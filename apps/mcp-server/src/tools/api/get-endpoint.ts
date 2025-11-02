/**
 * GET /jobs/:jobId/endpoints/:id - Get an endpoint by ID
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { EndpointResponse } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// Define schemas once, get both validator and MCP shape
const [GetEndpointRequestSchema, getEndpointInputShape] = createSchemaAndShape({
    jobId: z.string().describe("Parent job ID"),
    id: z.string().describe("Endpoint ID"),
});

const [EndpointResponseSchema, endpointResponseShape] = createSchemaAndShape({
    id: z.string(),
    jobId: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    baselineCron: z.string().optional(),
    baselineIntervalMs: z.number().optional(),
    minIntervalMs: z.number().optional(),
    maxIntervalMs: z.number().optional(),
    nextRunAt: z.string().datetime(),
    lastRunAt: z.string().datetime().optional(),
    failureCount: z.number().int(),
    pausedUntil: z.string().datetime().optional(),
    url: z.string().optional(),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
    headersJson: z.record(z.string(), z.string()).optional(),
    bodyJson: z.any().optional(),
    timeoutMs: z.number().optional(),
    maxExecutionTimeMs: z.number().optional(),
    maxResponseSizeKb: z.number().optional(),
    aiHintIntervalMs: z.number().int().optional(),
    aiHintNextRunAt: z.string().datetime().optional(),
    aiHintExpiresAt: z.string().datetime().optional(),
    aiHintReason: z.string().optional(),
});

// Type assertions to ensure compatibility with API contracts
const _outputCheck: z.ZodType<EndpointResponse> = EndpointResponseSchema;

export function registerGetEndpoint(server: McpServer, apiClient: ApiClient) {
    registerApiTool(server, apiClient, {
        name: "GET_jobs_jobId_endpoints_id",
        title: "Get Endpoint",
        description: "Retrieve a single endpoint by ID. Returns full configuration including baseline schedule, AI hints, execution settings, and current state.",
        inputSchema: getEndpointInputShape,
        outputSchema: endpointResponseShape,
        inputValidator: GetEndpointRequestSchema,
        outputValidator: EndpointResponseSchema,
        method: "GET",
        path: input => `/jobs/${input.jobId}/endpoints/${input.id}`,
        successMessage: endpoint => `✅ Retrieved endpoint "${endpoint.name}" (ID: ${endpoint.id})`,
    });
}
