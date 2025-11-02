/**
 * POST /jobs/:id/pause - Pause a job
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { JobResponse } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// Define schemas once, get both validator and MCP shape
const [PauseJobRequestSchema, pauseJobInputShape] = createSchemaAndShape({
  id: z.string().describe("Job ID to pause"),
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

export function registerPauseJob(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "POST_jobs_id_pause",
    title: "Pause Job",
    description: "Pause a job. The job status will be set to 'paused' and all associated endpoints will stop executing until resumed.",
    inputSchema: pauseJobInputShape,
    outputSchema: jobResponseShape,
    inputValidator: PauseJobRequestSchema,
    outputValidator: JobResponseSchema,
    method: "POST",
    path: input => `/jobs/${input.id}/pause`,
    successMessage: job => `✅ Paused job "${job.name}" (ID: ${job.id})`,
  });
}
