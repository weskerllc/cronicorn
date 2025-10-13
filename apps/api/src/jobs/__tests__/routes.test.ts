/**
 * Minimal tests for POST /jobs route using testClient.
 *
 * These tests verify basic routing and request handling without database or auth:
 * - Route structure and method validation
 * - Request schema validation (via Zod)
 * - Response format validation
 *
 * For full integration tests with database, see separate integration test file.
 */
import { testClient } from "hono/testing";
import { describe, expect, it } from "vitest";

import type { CreateJobRequest } from "../schemas.js";

import { createJobsRouter } from "../routes.js";

// Mock Drizzle transaction that simulates the insert API
const mockTx = {
    insert: () => ({
        values: () => ({
            returning: () => Promise.resolve([{
                id: "mock-endpoint-id",
                jobId: "mock-job-id",
                tenantId: "test-user",
                name: "Mock Job",
                nextRunAt: new Date(),
                failureCount: 0,
            }]),
        }),
    }),
} as never;

// Mock database for testing (validates transaction structure without persistence)
const mockDb = {
    transaction: async <T>(fn: (tx: never) => Promise<T>) => {
        // Execute transaction callback with mock Drizzle transaction
        return fn(mockTx);
    },
} as never;

// Mock auth for testing (always returns valid user session)
const mockAuth = {
    api: {
        getSession: async () => ({
            user: { id: "test-user", email: "test@example.com", name: "Test" },
            session: { id: "sess", userId: "test-user", expiresAt: new Date() },
        }),
    },
} as never;

describe("pOST /jobs routing and validation", () => {
    it("rejects request with missing baseline schedule", async () => {
        // Arrange
        const app = createJobsRouter(mockDb, mockAuth);
        const client = testClient(app);

        const invalidRequest = {
            name: "Invalid job",
            url: "https://api.example.com/webhook",
            method: "GET",
            // Missing both baselineCron and baselineIntervalMs
        };

        // Act
        const res = await client.jobs.$post({
            // @ts-expect-error - Testing invalid request
            json: invalidRequest,
        });

        // Assert - should fail validation
        expect(res.status).toBe(400);
    });

    it("rejects request with invalid URL", async () => {
        // Arrange
        const app = createJobsRouter(mockDb, mockAuth);
        const client = testClient(app);

        const invalidRequest = {
            name: "Invalid URL job",
            baselineIntervalMs: 60000,
            url: "not-a-valid-url",
            method: "GET",
        };

        // Act
        const res = await client.jobs.$post({
            // @ts-expect-error - Testing invalid request
            json: invalidRequest,
        });

        // Assert - should fail validation
        expect(res.status).toBe(400);
    });

    it("accepts valid cron-based job request structure", async () => {
        // Arrange
        const app = createJobsRouter(mockDb, mockAuth);
        const client = testClient(app);

        const validRequest: CreateJobRequest = {
            name: "Daily report",
            baselineCron: "0 9 * * *",
            url: "https://api.example.com/webhook",
            method: "POST",
        };

        // Act
        const res = await client.jobs.$post({
            json: validRequest,
        });

        // Assert - should accept valid structure (may fail at DB layer, but validation passed)
        expect(res.status).not.toBe(400); // Not a validation error
    });

    it("accepts valid interval-based job request structure", async () => {
        // Arrange
        const app = createJobsRouter(mockDb, mockAuth);
        const client = testClient(app);

        const validRequest: CreateJobRequest = {
            name: "Hourly sync",
            baselineIntervalMs: 3600000,
            url: "https://api.example.com/sync",
            method: "GET",
        };

        // Act
        const res = await client.jobs.$post({
            json: validRequest,
        });

        // Assert - should accept valid structure
        expect(res.status).not.toBe(400);
    });
});
