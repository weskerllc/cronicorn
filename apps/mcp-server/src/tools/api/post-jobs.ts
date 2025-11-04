/**
 * POST /jobs - Create a new job
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import { base as jobsBase } from "@cronicorn/api-contracts/jobs";
import type { CreateJobRequest, JobResponse } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Use base schemas from api-contracts (no OpenAPI decorations)
const CreateJobRequestSchema = jobsBase.CreateJobRequestBaseSchema;
const JobResponseSchema = jobsBase.JobResponseBaseSchema;

export function registerPostJobs(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "POST_jobs",
    title: "Create Job",
    description: "Create a new job. Jobs are containers for endpoints that execute on schedules. After creating a job, use POST_jobs_jobId_endpoints to add executable endpoints.",
    inputSchema: toShape(CreateJobRequestSchema),
    outputSchema: toShape(JobResponseSchema),
    inputValidator: CreateJobRequestSchema,
    outputValidator: JobResponseSchema,
    method: "POST",
    path: "/jobs",
    successMessage: job => `✅ Created job "${job.name}" (ID: ${job.id})`,
  });
}
