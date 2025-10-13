/**
 * Unit tests for JobsManager.
 *
 * Tests business logic in isolation without HTTP framework dependencies.
 * Benefits:
 * - No Hono mocking required
 * - Faster test execution
 * - Clear separation of concerns
 * - Framework-agnostic (same manager used by API, MCP server, etc.)
 */
import type { Clock } from "@cronicorn/domain";

import { describe, expect, it } from "vitest";

import type { CreateJobInput, TransactionProvider } from "../../types.js";

import { JobsManager } from "../../jobs/manager.js";

// Simple fake clock for testing
class FakeClock implements Clock {
    private t: number;

    constructor(start: Date = new Date("2025-01-01T00:00:00Z")) {
        this.t = start.getTime();
    }

    now(): Date {
        return new Date(this.t);
    }

    async sleep(ms: number): Promise<void> {
        this.t += ms;
    }
}

// Mock database that simulates Drizzle transaction API
// eslint-disable-next-line ts/consistent-type-assertions
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

const mockTxProvider: TransactionProvider = {
    transaction: async <T>(fn: (tx: never) => Promise<T>) => fn(mockTx),
};

describe("jobs manager", () => {
    describe("createJob", () => {
        it("creates job with cron schedule and calculates nextRunAt", async () => {
            // Arrange
            const clock = new FakeClock(new Date("2025-01-15T08:00:00Z"));
            const manager = new JobsManager(mockTxProvider, clock);

            const input: CreateJobInput = {
                name: "Daily report",
                baselineCron: "0 9 * * *", // Every day at 9 AM UTC
                url: "https://api.example.com/webhook",
                method: "POST",
            };

            // Act
            const job = await manager.createJob("user-123", input);

            // Assert
            expect(job.name).toBe("Daily report");
            expect(job.baselineCron).toBe("0 9 * * *");
            expect(job.tenantId).toBe("user-123");
            expect(job.failureCount).toBe(0);

            // Verify nextRunAt is calculated correctly
            // From 8 AM on Jan 15, next 9 AM should be Jan 15 at 9 AM
            const expectedNextRun = new Date("2025-01-15T09:00:00Z");
            expect(job.nextRunAt.getTime()).toBe(expectedNextRun.getTime());
        });

        it("creates job with interval schedule and calculates nextRunAt", async () => {
            // Arrange
            const now = new Date("2025-01-15T08:00:00Z");
            const clock = new FakeClock(now);
            const manager = new JobsManager(mockTxProvider, clock);

            const intervalMs = 3600000; // 1 hour
            const input: CreateJobInput = {
                name: "Hourly sync",
                baselineIntervalMs: intervalMs,
                url: "https://api.example.com/sync",
                method: "GET",
            };

            // Act
            const job = await manager.createJob("user-456", input);

            // Assert
            expect(job.name).toBe("Hourly sync");
            expect(job.baselineIntervalMs).toBe(intervalMs);
            expect(job.tenantId).toBe("user-456");

            // Verify nextRunAt is now + interval
            const expectedNextRun = new Date(now.getTime() + intervalMs);
            expect(job.nextRunAt.getTime()).toBe(expectedNextRun.getTime());
        });

        it("includes optional fields in created job", async () => {
            // Arrange
            const clock = new FakeClock();
            const manager = new JobsManager(mockTxProvider, clock);

            const input: CreateJobInput = {
                name: "Complex job",
                baselineIntervalMs: 60000,
                minIntervalMs: 30000,
                maxIntervalMs: 300000,
                url: "https://api.example.com/complex",
                method: "POST",
                headersJson: {
                    "Content-Type": "application/json",
                    "X-API-Key": "secret",
                },
                bodyJson: {
                    action: "process",
                    data: { foo: "bar" },
                },
                timeoutMs: 30000,
            };

            // Act
            const job = await manager.createJob("user-789", input);

            // Assert
            expect(job.minIntervalMs).toBe(30000);
            expect(job.maxIntervalMs).toBe(300000);
            expect(job.headersJson).toEqual({
                "Content-Type": "application/json",
                "X-API-Key": "secret",
            });
            expect(job.bodyJson).toEqual({
                action: "process",
                data: { foo: "bar" },
            });
            expect(job.timeoutMs).toBe(30000);
        });

        it("handles weekly cron expression correctly", async () => {
            // Arrange - Start on Wednesday Jan 15, 2025
            const clock = new FakeClock(new Date("2025-01-15T08:00:00Z"));
            const manager = new JobsManager(mockTxProvider, clock);

            const input: CreateJobInput = {
                name: "Weekly Monday report",
                baselineCron: "0 9 * * 1", // Every Monday at 9 AM UTC
                url: "https://api.example.com/weekly",
                method: "POST",
            };

            // Act
            const job = await manager.createJob("user-weekly", input);

            // Assert - Next Monday is Jan 20, 2025
            const expectedNextRun = new Date("2025-01-20T09:00:00Z");
            expect(job.nextRunAt.getTime()).toBe(expectedNextRun.getTime());
            expect(job.nextRunAt.getUTCDay()).toBe(1); // Monday
        });

        it("uses FakeClock for deterministic time in tests", async () => {
            // Arrange - Fixed time for predictable tests
            const fixedTime = new Date("2025-06-15T12:30:00Z");
            const clock = new FakeClock(fixedTime);
            const manager = new JobsManager(mockTxProvider, clock);

            const input: CreateJobInput = {
                name: "Interval job",
                baselineIntervalMs: 1800000, // 30 minutes
                url: "https://api.example.com/test",
                method: "GET",
            };

            // Act
            const job = await manager.createJob("test-user", input);

            // Assert - nextRunAt should be exactly 30 minutes from fixed time
            const expectedNextRun = new Date("2025-06-15T13:00:00Z");
            expect(job.nextRunAt.getTime()).toBe(expectedNextRun.getTime());
        });

        it("generates unique IDs for each job", async () => {
            // Arrange
            const clock = new FakeClock();
            const manager = new JobsManager(mockTxProvider, clock);

            const input: CreateJobInput = {
                name: "Test job",
                baselineIntervalMs: 60000,
                url: "https://api.example.com/test",
                method: "GET",
            };

            // Act - Create two jobs
            const job1 = await manager.createJob("user-1", input);
            const job2 = await manager.createJob("user-1", input);

            // Assert - IDs should be different (nanoid generates unique IDs)
            expect(job1.id).toBeTruthy();
            expect(job2.id).toBeTruthy();
            expect(job1.id).not.toBe(job2.id);
            expect(job1.jobId).not.toBe(job2.jobId);
        });
    });
});
