/**
 * GET /jobs/:id - Get a job by ID
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { JobResponse } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// Define schemas once, get both validator and MCP shape
const [GetJobRequestSchema, getJobInputShape] = createSchemaAndShape({
  id: z.string().describe("Job ID"),
});

const [JobResponseSchema, jobResponseShape] = createSchemaAndShape({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(["active", "paused", "archived"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  archivedAt: z.string().datetime().optional(),
});

// Type assertions to ensure compatibility with API contracts
const _outputCheck: z.ZodType<JobResponse> = JobResponseSchema;

export function registerGetJob(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "GET_jobs_id",
    title: "Get Job",
    description: "Retrieve a single job by ID. Returns full job details including status and timestamps.",
    inputSchema: getJobInputShape,
    outputSchema: jobResponseShape,
    inputValidator: GetJobRequestSchema,
    outputValidator: JobResponseSchema,
    method: "GET",
    path: input => `/jobs/${input.id}`,
    successMessage: job => `✅ Retrieved job "${job.name}" (ID: ${job.id})`,
  });
}
