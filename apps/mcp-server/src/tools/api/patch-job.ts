/**
 * PATCH /jobs/:id - Update a job
 *
 * 1:1 mapping to API endpoint - uses helper utilities for concise implementation
 */

import type { JobResponse, UpdateJobRequest } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { createSchemaAndShape, registerApiTool } from "../helpers/index.js";

// Define schemas once, get both validator and MCP shape
const [PatchJobRequestSchema, patchJobInputShape] = createSchemaAndShape({
    id: z.string().describe("Job ID to update"),
    name: z.string().min(1).max(255).optional().describe("New job name"),
    description: z.string().max(1000).optional().describe("New job description"),
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
const _inputCheck: z.ZodType<UpdateJobRequest & { id: string }> = PatchJobRequestSchema;
const _outputCheck: z.ZodType<JobResponse> = JobResponseSchema;

export function registerPatchJob(server: McpServer, apiClient: ApiClient) {
    registerApiTool(server, apiClient, {
        name: "PATCH_jobs_id",
        title: "Update Job",
        description: "Update job name or description. All fields are optional - only provided fields will be updated.",
        inputSchema: patchJobInputShape,
        outputSchema: jobResponseShape,
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
