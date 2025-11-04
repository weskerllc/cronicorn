/**
 * DELETE /jobs/:id - Archive a job (soft delete)
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import { base as jobsBase } from "@cronicorn/api-contracts/jobs";
import type { JobResponse } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Simple DELETE request with just an ID
const DeleteJobRequestSchema = z.object({
  id: z.string().describe("Job ID to archive"),
});

const JobResponseSchema = jobsBase.JobResponseBaseSchema;

export function registerDeleteJob(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "DELETE_jobs_id",
    title: "Archive Job",
    description: "Archive a job (soft delete). The job status will be set to 'archived' and an archivedAt timestamp will be recorded. Archived jobs can be recovered if needed.",
    inputSchema: toShape(DeleteJobRequestSchema),
    outputSchema: toShape(JobResponseSchema),
    inputValidator: DeleteJobRequestSchema,
    outputValidator: JobResponseSchema,
    method: "DELETE",
    path: input => `/jobs/${input.id}`,
    successMessage: job => `✅ Archived job "${job.name}" (ID: ${job.id})`,
  });
}
