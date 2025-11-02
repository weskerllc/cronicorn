/**
 * POST /jobs/:jobId/endpoints - Add an endpoint to a job
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { AddEndpointRequest, EndpointResponse } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// Define schemas once, get both validator and MCP shape
const [AddEndpointRequestSchema, addEndpointInputShape] = createSchemaAndShape({
    jobId: z.string().describe("Parent job ID"),
    name: z.string().min(1).max(255).describe("Endpoint name"),
    description: z.string().max(2000).optional().describe("Endpoint-specific context"),
    baselineCron: z.string().optional().describe("Cron expression (e.g., '0 9 * * *')"),
    baselineIntervalMs: z.number().int().positive().optional().describe("Interval in milliseconds"),
    minIntervalMs: z.number().int().positive().optional().describe("Minimum interval constraint"),
    maxIntervalMs: z.number().int().positive().optional().describe("Maximum interval constraint"),
    url: z.string().url().describe("HTTP endpoint URL"),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET").describe("HTTP method"),
    headersJson: z.record(z.string(), z.string()).optional().describe("HTTP headers as key-value pairs"),
    bodyJson: z.any().optional().describe("Request body (any valid JSON)"),
    timeoutMs: z.number().int().positive().optional().describe("Request timeout in milliseconds"),
    maxExecutionTimeMs: z.number().int().positive().max(1800000).optional().describe("Max execution time for lock duration (max 30 min)"),
    maxResponseSizeKb: z.number().int().positive().optional().describe("Max response size in kilobytes"),
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

export function registerPostEndpoint(server: McpServer, apiClient: ApiClient) {
    registerApiTool(server, apiClient, {
        name: "POST_jobs_jobId_endpoints",
        title: "Add Endpoint",
        description: "Add an endpoint to a job. Must provide either baselineCron OR baselineIntervalMs (not both). The endpoint will execute according to the baseline schedule and can be dynamically adjusted with AI hints.",
        inputSchema: addEndpointInputShape,
        outputSchema: endpointResponseShape,
        inputValidator: AddEndpointRequestSchema,
        outputValidator: EndpointResponseSchema,
        method: "POST",
        path: input => `/jobs/${input.jobId}/endpoints`,
        transformInput: (input) => {
            const { jobId, ...body } = input;
            return body;
        },
        successMessage: endpoint => `✅ Created endpoint "${endpoint.name}" (ID: ${endpoint.id})`,
    });
}
