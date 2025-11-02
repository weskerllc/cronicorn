/**
 * PATCH /jobs/:jobId/endpoints/:id - Update an endpoint
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { EndpointResponse, UpdateEndpointRequest } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// Define schemas once, get both validator and MCP shape
const [PatchEndpointRequestSchema, patchEndpointInputShape] = createSchemaAndShape({
  jobId: z.string().describe("Parent job ID"),
  id: z.string().describe("Endpoint ID to update"),
  name: z.string().min(1).max(255).optional().describe("New endpoint name"),
  description: z.string().max(2000).optional().describe("New endpoint description"),
  baselineCron: z.string().optional().describe("New cron expression"),
  baselineIntervalMs: z.number().int().positive().optional().describe("New interval in milliseconds"),
  minIntervalMs: z.number().int().positive().optional().describe("New minimum interval"),
  maxIntervalMs: z.number().int().positive().optional().describe("New maximum interval"),
  url: z.string().url().optional().describe("New HTTP endpoint URL"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional().describe("New HTTP method"),
  headersJson: z.record(z.string(), z.string()).optional().describe("New HTTP headers"),
  bodyJson: z.any().optional().describe("New request body"),
  timeoutMs: z.number().int().positive().optional().describe("New timeout"),
  maxExecutionTimeMs: z.number().int().positive().max(1800000).optional().describe("New max execution time"),
  maxResponseSizeKb: z.number().int().positive().optional().describe("New max response size"),
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
const _inputCheck: z.ZodType<UpdateEndpointRequest & { jobId: string; id: string }> = PatchEndpointRequestSchema;
const _outputCheck: z.ZodType<EndpointResponse> = EndpointResponseSchema;

export function registerPatchEndpoint(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "PATCH_jobs_jobId_endpoints_id",
    title: "Update Endpoint",
    description: "Update endpoint configuration. All fields are optional - only provided fields will be updated.",
    inputSchema: patchEndpointInputShape,
    outputSchema: endpointResponseShape,
    inputValidator: PatchEndpointRequestSchema,
    outputValidator: EndpointResponseSchema,
    method: "PATCH",
    path: input => `/jobs/${input.jobId}/endpoints/${input.id}`,
    transformInput: (input) => {
      const { jobId, id, ...body } = input;
      return body;
    },
    successMessage: endpoint => `✅ Updated endpoint "${endpoint.name}" (ID: ${endpoint.id})`,
  });
}
