/**
 * POST /jobs/:id/resume - Resume a paused job
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { JobResponse } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// Define schemas once, get both validator and MCP shape
const [ResumeJobRequestSchema, resumeJobInputShape] = createSchemaAndShape({
  id: z.string().describe("Job ID to resume"),
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

export function registerResumeJob(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "POST_jobs_id_resume",
    title: "Resume Job",
    description: "Resume a paused job. The job status will be set to 'active' and all associated endpoints will resume executing on their schedules.",
    inputSchema: resumeJobInputShape,
    outputSchema: jobResponseShape,
    inputValidator: ResumeJobRequestSchema,
    outputValidator: JobResponseSchema,
    method: "POST",
    path: input => `/jobs/${input.id}/resume`,
    successMessage: job => `✅ Resumed job "${job.name}" (ID: ${job.id})`,
  });
}
