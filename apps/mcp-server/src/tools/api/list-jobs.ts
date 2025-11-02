/**
 * GET /jobs - List all jobs
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { JobWithCountResponse } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// Define schemas once, get both validator and MCP shape
const [ListJobsRequestSchema, listJobsInputShape] = createSchemaAndShape({
    status: z.enum(["active", "paused", "archived"]).optional().describe("Filter by job status"),
});

const [JobWithCountResponseSchema, _jobWithCountShape] = createSchemaAndShape({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    description: z.string().optional(),
    status: z.enum(["active", "paused", "archived"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    archivedAt: z.string().datetime().optional(),
    endpointCount: z.number().int(),
});

const [ListJobsResponseSchema, listJobsResponseShape] = createSchemaAndShape({
    jobs: z.array(JobWithCountResponseSchema),
});

// Type assertions to ensure compatibility with API contracts
const _itemCheck: z.ZodType<JobWithCountResponse> = JobWithCountResponseSchema;

export function registerListJobs(server: McpServer, apiClient: ApiClient) {
    registerApiTool(server, apiClient, {
        name: "GET_jobs",
        title: "List Jobs",
        description: "List all jobs for the authenticated user. Optionally filter by status (active, paused, archived). Returns jobs with endpoint counts.",
        inputSchema: listJobsInputShape,
        outputSchema: listJobsResponseShape,
        inputValidator: ListJobsRequestSchema,
        outputValidator: ListJobsResponseSchema,
        method: "GET",
        path: "/jobs",
        successMessage: result => `✅ Found ${result.jobs.length} job(s)`,
    });
}
