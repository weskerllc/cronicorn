/**
 * POST /jobs - Create a new job
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { CreateJobRequest, JobResponse } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// Define schemas once, get both validator and MCP shape
const [CreateJobRequestSchema, createJobInputShape] = createSchemaAndShape({
    name: z.string().min(1).max(255).describe("Job name"),
    description: z.string().max(1000).optional().describe("Job description"),
});

const [JobResponseSchema, jobResponseShape] = createSchemaAndShape({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    description: z.string().optional(),
    status: z.enum(["active", "paused", "archived"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    archivedAt: z.string().datetime().optional(),
});

// Type assertions to ensure compatibility with API contracts
const _inputCheck: z.ZodType<CreateJobRequest> = CreateJobRequestSchema;
const _outputCheck: z.ZodType<JobResponse> = JobResponseSchema;

export function registerPostJobs(server: McpServer, apiClient: ApiClient) {
    registerApiTool(server, apiClient, {
        name: "POST_jobs",
        title: "Create Job",
        description: "Create a new job. Jobs are containers for endpoints that execute on schedules. After creating a job, use POST_jobs_jobId_endpoints to add executable endpoints.",
        inputSchema: createJobInputShape,
        outputSchema: jobResponseShape,
        inputValidator: CreateJobRequestSchema,
        outputValidator: JobResponseSchema,
        method: "POST",
        path: "/jobs",
        successMessage: job => `✅ Created job "${job.name}" (ID: ${job.id})`,
    });
}
