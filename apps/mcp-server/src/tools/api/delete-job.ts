/**
 * DELETE /jobs/:id - Archive a job (soft delete)
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { JobResponse } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// Define schemas once, get both validator and MCP shape
const [DeleteJobRequestSchema, deleteJobInputShape] = createSchemaAndShape({
    id: z.string().describe("Job ID to archive"),
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
const _outputCheck: z.ZodType<JobResponse> = JobResponseSchema;

export function registerDeleteJob(server: McpServer, apiClient: ApiClient) {
    registerApiTool(server, apiClient, {
        name: "DELETE_jobs_id",
        title: "Archive Job",
        description: "Archive a job (soft delete). The job status will be set to 'archived' and an archivedAt timestamp will be recorded. Archived jobs can be recovered if needed.",
        inputSchema: deleteJobInputShape,
        outputSchema: jobResponseShape,
        inputValidator: DeleteJobRequestSchema,
        outputValidator: JobResponseSchema,
        method: "DELETE",
        path: input => `/jobs/${input.id}`,
        successMessage: job => `✅ Archived job "${job.name}" (ID: ${job.id})`,
    });
}
