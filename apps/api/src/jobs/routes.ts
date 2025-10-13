import type { JobEndpoint } from "@cronicorn/domain";

import { CronParserAdapter } from "@cronicorn/adapter-cron";
import { DrizzleJobsRepo } from "@cronicorn/adapter-drizzle";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { nanoid } from "nanoid";

import type { Auth } from "../auth/config";
import type { Database } from "../lib/db";

import { getAuthContext, requireAuth } from "../auth/middleware.js";
import {
    type CreateJobRequest,
    CreateJobRequestSchema,
    type CreateJobResponse,
    CreateJobResponseSchema,
} from "./schemas.js";

/**
 * Job routes - CRUD operations for job management
 */

// Error response schemas for OpenAPI
const ErrorResponseSchema = z.object({
    error: z.string(),
    message: z.string().optional(),
}).openapi("ErrorResponse");

// ----- Route Definitions -----

const createJobRoute = createRoute({
    method: "post",
    path: "/jobs",
    tags: ["Jobs"],
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: CreateJobRequestSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Job created successfully",
            content: {
                "application/json": {
                    schema: CreateJobResponseSchema,
                },
            },
        },
        400: {
            description: "Invalid request body",
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
        },
        401: {
            description: "Unauthorized - Valid authentication required",
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
        },
        500: {
            description: "Internal server error",
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
        },
    },
});

// ----- Route Handlers -----

export function createJobsRouter(db: Database, auth: Auth) {
    const app = new OpenAPIHono();

    // Apply auth middleware to all routes
    app.use("*", requireAuth(auth));

    // POST /jobs - Create a new job
    app.openapi(createJobRoute, async (c) => {
        const { userId } = getAuthContext(c);
        const body: CreateJobRequest = await c.req.json();

        // Use database transaction for atomicity
        const result = await db.transaction(async (tx) => {
            const now = new Date();
            const endpointId = nanoid();
            const jobId = nanoid(); // TODO: Proper job grouping in future phase

            // Build JobEndpoint domain entity
            const endpoint: JobEndpoint = {
                id: endpointId,
                jobId,
                tenantId: userId, // Use userId as tenantId for now
                name: body.name,
                baselineCron: body.baselineCron,
                baselineIntervalMs: body.baselineIntervalMs,
                minIntervalMs: body.minIntervalMs,
                maxIntervalMs: body.maxIntervalMs,
                nextRunAt: now, // Temporary: will calculate below
                failureCount: 0,
                url: body.url,
                method: body.method,
                headersJson: body.headersJson,
                bodyJson: body.bodyJson,
                timeoutMs: body.timeoutMs,
            };

            // Calculate initial nextRunAt based on baseline schedule
            // For cron: calculate next occurrence from now
            // For interval: add interval to now
            // The scheduler will use full governor logic (with AI hints, clamps, etc.) for subsequent runs
            if (endpoint.baselineCron) {
                const cronAdapter = new CronParserAdapter();
                endpoint.nextRunAt = cronAdapter.next(endpoint.baselineCron, now);
            }
            else if (endpoint.baselineIntervalMs) {
                endpoint.nextRunAt = new Date(now.getTime() + endpoint.baselineIntervalMs);
            }
            else {
                // Fallback: shouldn't happen due to schema validation, but be safe
                endpoint.nextRunAt = new Date(now.getTime() + 60_000);
            }

            // Persist to database
            // eslint-disable-next-line ts/no-explicit-any
            const repo = new DrizzleJobsRepo(tx as any, () => now);
            await repo.add(endpoint);

            return endpoint;
        });

        // Map domain entity to API response
        const response: CreateJobResponse = {
            id: result.id,
            name: result.name,
            baselineCron: result.baselineCron,
            baselineIntervalMs: result.baselineIntervalMs,
            minIntervalMs: result.minIntervalMs,
            maxIntervalMs: result.maxIntervalMs,
            nextRunAt: result.nextRunAt.toISOString(),
            failureCount: result.failureCount,
            url: result.url,
            method: result.method,
            headersJson: result.headersJson,
            bodyJson: result.bodyJson,
            timeoutMs: result.timeoutMs,
            createdAt: new Date().toISOString(), // TODO: Add createdAt/updatedAt to schema
            updatedAt: new Date().toISOString(),
        };

        return c.json(response, 201);
    });

    return app;
}
