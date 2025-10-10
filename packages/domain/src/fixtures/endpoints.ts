/**
 * Endpoint fixtures for testing.
 */

import type { JobEndpoint } from "../entities/index.js";

/**
 * Create a test endpoint with sensible defaults.
 * Override any fields as needed.
 */
export function makeEndpoint(overrides: Partial<JobEndpoint> = {}): JobEndpoint {
    const now = new Date();
    return {
        id: "ep-1",
        jobId: "job-1",
        tenantId: "t-1",
        name: "test_endpoint",
        baselineIntervalMs: 300_000, // 5 minutes
        nextRunAt: now,
        failureCount: 0,
        ...overrides,
    };
}
