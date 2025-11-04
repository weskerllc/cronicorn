/**
 * GET /jobs/:id - Get a job by ID
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { base as jobsBase } from "@cronicorn/api-contracts/jobs";
import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Simple GET request with just an ID
const GetJobRequestSchema = z.object({
  id: z.string().describe("Job ID"),
});

const JobResponseSchema = jobsBase.JobResponseBaseSchema;

export function registerGetJob(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "GET_jobs_id",
    title: "Get Job",
    description: "Retrieve a single job by ID. Returns full job details including status and timestamps.",
    inputSchema: toShape(GetJobRequestSchema),
    outputSchema: toShape(JobResponseSchema),
    inputValidator: GetJobRequestSchema,
    outputValidator: JobResponseSchema,
    method: "GET",
    path: input => `/jobs/${input.id}`,
    successMessage: job => `✅ Retrieved job "${job.name}" (ID: ${job.id})`,
  });
}
