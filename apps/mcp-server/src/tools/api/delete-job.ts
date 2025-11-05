/**
 * DELETE /jobs/:id - Archive a job (soft delete)
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ArchiveJobDescription, ArchiveJobSummary, base as jobsBase } from "@cronicorn/api-contracts/jobs";
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
    name: "archiveJob",
    title: ArchiveJobSummary,
    description: ArchiveJobDescription,
    inputSchema: toShape(DeleteJobRequestSchema),
    outputSchema: toShape(JobResponseSchema),
    inputValidator: DeleteJobRequestSchema,
    outputValidator: JobResponseSchema,
    method: "DELETE",
    path: input => `/jobs/${input.id}`,
    successMessage: job => `✅ Archived job "${job.name}" (ID: ${job.id})`,
  });
}
