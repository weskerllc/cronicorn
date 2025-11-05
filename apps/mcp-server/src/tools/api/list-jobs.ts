/**
 * GET /jobs - List all jobs
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { base as jobsBase, ListJobsDescription, ListJobsSummary } from "@cronicorn/api-contracts/jobs";
import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// Simple list request with optional status filter
const ListJobsRequestSchema = z.object({
  status: z.enum(["active", "paused", "archived"]).optional().describe("Filter by job status"),
});

const JobWithCountResponseSchema = jobsBase.JobWithCountResponseBaseSchema;

const ListJobsResponseSchema = z.object({
  jobs: z.array(JobWithCountResponseSchema),
});

export function registerListJobs(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "listJobs",
    title: ListJobsSummary,
    description: ListJobsDescription,
    inputSchema: toShape(ListJobsRequestSchema),
    outputSchema: toShape(ListJobsResponseSchema),
    inputValidator: ListJobsRequestSchema,
    outputValidator: ListJobsResponseSchema,
    method: "GET",
    path: "/jobs",
    successMessage: result => `✅ Found ${result.jobs.length} job(s)`,
  });
}
