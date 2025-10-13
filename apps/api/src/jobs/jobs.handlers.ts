import type { JobEndpoint } from "@cronicorn/domain";

import * as HTTPStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "../types.js";
import type { CreateRoute } from "./jobs.routes.js";
import type { JobResponse } from "./jobs.schemas.js";

import { getAuthContext } from "../auth/middleware.js";

export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const input = c.req.valid("json");
    const { userId } = getAuthContext(c);

    // Use singleton manager from context (no per-request instantiation)
    const manager = c.get("jobsManager");
    const result = await manager.createJob(userId, input);
    const response = mapJobToResponse(result);
    return c.json(response, HTTPStatusCodes.CREATED);
};

function mapJobToResponse(job: JobEndpoint): JobResponse {
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
