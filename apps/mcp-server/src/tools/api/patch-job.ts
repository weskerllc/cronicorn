/**
 * PATCH /jobs/:id - Update a job
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { base as jobsBase } from "@cronicorn/api-contracts/jobs";
import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Extend base schema to include id for MCP tool input
const PatchJobRequestSchema = jobsBase.UpdateJobRequestBaseSchema.and(z.object({
  id: z.string().describe("Job ID to update"),
}));

const JobResponseSchema = jobsBase.JobResponseBaseSchema;

export function registerPatchJob(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "PATCH_jobs_id",
    title: "Update Job",
    description: "Update job name or description. All fields are optional - only provided fields will be updated.",
    inputSchema: toShape(PatchJobRequestSchema),
    outputSchema: toShape(JobResponseSchema),
    inputValidator: PatchJobRequestSchema,
    outputValidator: JobResponseSchema,
    method: "PATCH",
    path: input => `/jobs/${input.id}`,
    transformInput: (input) => {
      const { id, ...body } = input;
      return body;
    },
    successMessage: job => `✅ Updated job "${job.name}" (ID: ${job.id})`,
  });
}
