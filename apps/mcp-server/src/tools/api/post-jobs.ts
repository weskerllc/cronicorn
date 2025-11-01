/**
 * POST /jobs - Create a new job
 *
 * 1:1 mapping to API endpoint - no transformation layer
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";

import { CreateJobRequestSchema, JobResponseSchema } from "@cronicorn/api-contracts/jobs";

import type { ApiClient } from "../../ports/api-client.js";

type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;
type JobResponse = z.infer<typeof JobResponseSchema>;

export function registerPostJobs(server: McpServer, apiClient: ApiClient) {
    server.registerTool(
        "POST_jobs",
        {
            title: "Create Job",
            description: "Create a new job. Jobs are containers for endpoints that execute on schedules. After creating a job, use POST_jobs_jobId_endpoints to add executable endpoints.",
            inputSchema: CreateJobRequestSchema.shape,
            outputSchema: JobResponseSchema.shape,
        },
        async (params) => {
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
        },
    );
}
