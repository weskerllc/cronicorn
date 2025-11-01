/**
 * POST /jobs - Create a new job
 *
 * 1:1 mapping to API endpoint - no transformation layer
 */

// Import ONLY TypeScript types from api-contracts (no Zod schemas to avoid OpenAPI issues)
import type { CreateJobRequest, JobResponse } from "@cronicorn/api-contracts/jobs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { ApiError } from "../../ports/api-client.js";

// Plain Zod schemas for MCP (no OpenAPI extensions)
// These mirror the API contract types but use plain Zod
const CreateJobRequestSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
}) satisfies z.ZodType<CreateJobRequest>;

const JobResponseSchema = z.object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    description: z.string().optional(),
    status: z.enum(["active", "paused", "archived"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    archivedAt: z.string().datetime().optional(),
}) satisfies z.ZodType<JobResponse>;

export function registerPostJobs(server: McpServer, apiClient: ApiClient) {
    server.registerTool(
        "POST_jobs",
        {
            title: "Create Job",
            description: "Create a new job. Jobs are containers for endpoints that execute on schedules. After creating a job, use POST_jobs_jobId_endpoints to add executable endpoints.",
            // Define MCP-specific schemas (plain Zod, no @hono/zod-openapi extensions)
            // We still use API contract schemas for validation, but not for MCP inputSchema
            inputSchema: {
                name: z.string().min(1).max(255).describe("Job name"),
                description: z.string().max(1000).optional().describe("Job description"),
            },
            outputSchema: {
                id: z.string(),
                userId: z.string(),
                name: z.string(),
                description: z.string().optional(),
                status: z.enum(["active", "paused", "archived"]),
                createdAt: z.string().datetime(),
                updatedAt: z.string().datetime(),
                archivedAt: z.string().datetime().optional(),
            },
        },
        async (params) => {
            try {
                // Validate input using API contract schema
                const validatedInput: CreateJobRequest = CreateJobRequestSchema.parse(params);

                // Call API endpoint directly - type-safe response
                const response = await apiClient.fetch<JobResponse>("/jobs", {
                    method: "POST",
                    body: JSON.stringify(validatedInput),
                });

                // Validate response using API contract schema for runtime safety
                const validatedResponse = JobResponseSchema.parse(response);

                return {
                    content: [
                        {
                            type: "text",
                            text: `✅ Created job "${validatedResponse.name}" (ID: ${validatedResponse.id})`,
                        },
                    ],
                    structuredContent: validatedResponse,
                };
            }
            catch (error) {
                // Handle API errors (4xx, 5xx responses)
                if (error instanceof ApiError) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `API Error (${error.statusCode}): ${error.message}`,
                            },
                        ],
                        isError: true,
                    };
                }

                // Handle validation errors or other unexpected errors
                const message = error instanceof Error ? error.message : String(error);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${message}`,
                        },
                    ],
                    isError: true,
                };
            }
        },
    );
}
