/**
 * POST /jobs/:id/resume - Resume a paused job
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { base as jobsBase, ResumeJobDescription, ResumeJobSummary } from "@cronicorn/api-contracts/jobs";
import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Simple POST request with just an ID
const ResumeJobRequestSchema = z.object({
  id: z.string().describe("Job ID to resume"),
});

const JobResponseSchema = jobsBase.JobResponseBaseSchema;

export function registerResumeJob(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "resumeJob",
    title: ResumeJobSummary,
    description: ResumeJobDescription,
    inputSchema: toShape(ResumeJobRequestSchema),
    outputSchema: toShape(JobResponseSchema),
    inputValidator: ResumeJobRequestSchema,
    outputValidator: JobResponseSchema,
    method: "POST",
    path: input => `/jobs/${input.id}/resume`,
    successMessage: job => `✅ Resumed job "${job.name}" (ID: ${job.id})`,
  });
}
