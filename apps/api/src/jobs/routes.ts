import type { JobEndpoint } from "@cronicorn/domain";
import type { TransactionProvider } from "@cronicorn/services";

import { JobsManager } from "@cronicorn/services/jobs";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

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

/**
 * Adapt Database to TransactionProvider interface.
 * This allows the manager to work with our Drizzle database.
 */
function createTransactionProvider(db: Database): TransactionProvider {
    return {
        transaction: async <T>(fn: (tx: unknown) => Promise<T>) => db.transaction(fn),
    };
}

export function createJobsRouter(db: Database, auth: Auth) {
    const app = new OpenAPIHono();

    // Apply auth middleware to all routes
    app.use("*", requireAuth(auth));

    // Adapt database to TransactionProvider once
    const txProvider = createTransactionProvider(db);

    // POST /jobs - Create a new job
    app.openapi(createJobRoute, async (c) => {
        const { userId } = getAuthContext(c);
        const body: CreateJobRequest = await c.req.json();

        // Delegate to manager for business logic
        const manager = new JobsManager(txProvider);
        const result = await manager.createJob(userId, body);

        // Map domain entity to API response
        const response: CreateJobResponse = mapJobToResponse(result);

        return c.json(response, 201);
    });

    return app;
}

/**
 * Map JobEndpoint domain entity to API response DTO.
 */
function mapJobToResponse(job: JobEndpoint): CreateJobResponse {
    return {
        id: job.id,
        name: job.name,
        baselineCron: job.baselineCron,
        baselineIntervalMs: job.baselineIntervalMs,
        minIntervalMs: job.minIntervalMs,
        maxIntervalMs: job.maxIntervalMs,
        nextRunAt: job.nextRunAt.toISOString(),
        failureCount: job.failureCount,
        url: job.url,
        method: job.method,
        headersJson: job.headersJson,
        bodyJson: job.bodyJson,
        timeoutMs: job.timeoutMs,
        createdAt: new Date().toISOString(), // TODO: Add createdAt/updatedAt to schema
        updatedAt: new Date().toISOString(),
    };
}
