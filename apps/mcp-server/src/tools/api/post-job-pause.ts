/**
 * POST /jobs/:id/pause - Pause a job
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { base as jobsBase, PauseJobDescription, PauseJobSummary } from "@cronicorn/api-contracts/jobs";
import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Simple POST request with just an ID
const PauseJobRequestSchema = z.object({
  id: z.string().describe("Job ID to pause"),
});

const JobResponseSchema = jobsBase.JobResponseBaseSchema;

export function registerPauseJob(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "pauseJob",
    title: PauseJobSummary,
    description: PauseJobDescription,
    inputSchema: toShape(PauseJobRequestSchema),
    outputSchema: toShape(JobResponseSchema),
    inputValidator: PauseJobRequestSchema,
    outputValidator: JobResponseSchema,
    method: "POST",
    path: input => `/jobs/${input.id}/pause`,
    successMessage: job => `✅ Paused job "${job.name}" (ID: ${job.id})`,
  });
}
