/**
 * POST /jobs - Create a new job
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { CreateJobDescription, CreateJobSummary, base as jobsBase } from "@cronicorn/api-contracts/jobs";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Use base schemas from api-contracts (no OpenAPI decorations)
const CreateJobRequestSchema = jobsBase.CreateJobRequestBaseSchema;
const JobResponseSchema = jobsBase.JobResponseBaseSchema;

export function registerPostJobs(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "createJob",
    title: CreateJobSummary,
    description: CreateJobDescription,
    inputSchema: toShape(CreateJobRequestSchema),
    outputSchema: toShape(JobResponseSchema),
    inputValidator: CreateJobRequestSchema,
    outputValidator: JobResponseSchema,
    method: "POST",
    path: "/jobs",
    successMessage: job => `✅ Created job "${job.name}" (ID: ${job.id})`,
  });
}
