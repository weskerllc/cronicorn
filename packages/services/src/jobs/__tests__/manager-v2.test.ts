import type { Clock, Cron, Job, JobEndpoint, JobsRepo, RunsRepo } from "@cronicorn/domain";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateEndpointInput, CreateJobInput } from "../manager-v2.js";

import { JobsManager } from "../manager-v2.js";

/**
 * Test suite for JobsManager (v2 - clean hexagonal architecture).
 *
 * Demonstrates:
 * - Pure dependency injection (no adapters, no TransactionProvider)
 * - Simple mocking of port interfaces
 * - Fast, isolated unit tests
 */
describe("jobsManager (v2)", () => {
    let mockJobsRepo: JobsRepo;
    let mockRunsRepo: RunsRepo;
    let fakeClock: Clock;
    let fakeCron: Cron;
    let manager: JobsManager;

    beforeEach(() => {
        // Mock repos with minimal setup - include all required methods
        mockJobsRepo = {
            createJob: vi.fn(),
            getJob: vi.fn(),
            listJobs: vi.fn(),
            updateJob: vi.fn(),
            archiveJob: vi.fn(),
            add: vi.fn(),
            listEndpointsByJob: vi.fn(),
            getEndpoint: vi.fn(),
            claimDueEndpoints: vi.fn(),
            setLock: vi.fn(),
            clearLock: vi.fn(),
            setNextRunAtIfEarlier: vi.fn(),
            writeAIHint: vi.fn(),
            setPausedUntil: vi.fn(),
            updateAfterRun: vi.fn(),
        };

        mockRunsRepo = {
            create: vi.fn(),
            finish: vi.fn(),
            listRuns: vi.fn(),
            getRunDetails: vi.fn(),
        };

        // Fake clock (deterministic time)
        const now = new Date("2025-01-14T12:00:00Z");
        fakeClock = {
            now: () => now,
            sleep: async () => { },
        };

        // Fake cron (simple +1 hour logic for testing)
        fakeCron = {
            next: (cron: string, from: Date) => new Date(from.getTime() + 3600_000),
        };

        // Instantiate manager with all dependencies injected
        manager = new JobsManager(mockJobsRepo, mockRunsRepo, fakeClock, fakeCron);
    });

    describe("createJob", () => {
        it("creates job with correct fields", async () => {
            const input: CreateJobInput = {
                name: "Flash Sale Coordination",
                description: "Orchestrates flash sale endpoints",
            };

            const mockJob: Job = {
                id: "job-123",
                userId: "user-1",
                name: input.name,
                description: input.description,
                status: "active",
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            vi.mocked(mockJobsRepo.createJob).mockResolvedValue(mockJob);

            const result = await manager.createJob("user-1", input);

            expect(mockJobsRepo.createJob).toHaveBeenCalledWith({
                userId: "user-1",
                name: "Flash Sale Coordination",
                description: "Orchestrates flash sale endpoints",
                status: "active",
            });
            expect(result).toEqual(mockJob);
        });
    });

    describe("createEndpoint", () => {
        it("creates endpoint with calculated nextRunAt from cron", async () => {
            const input: CreateEndpointInput = {
                name: "Check inventory",
                baselineCron: "*/5 * * * *",
                url: "https://api.example.com/inventory",
                method: "GET",
            };

            await manager.createEndpoint("user-1", input);

            expect(mockJobsRepo.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "Check inventory",
                    baselineCron: "*/5 * * * *",
                    tenantId: "user-1",
                    // nextRunAt should be clock.now() + 1 hour (from fake cron)
                    nextRunAt: new Date("2025-01-14T13:00:00Z"),
                    failureCount: 0,
                }),
            );
        });

        it("creates endpoint with calculated nextRunAt from interval", async () => {
            const input: CreateEndpointInput = {
                name: "Health check",
                baselineIntervalMs: 30_000, // 30 seconds
                url: "https://api.example.com/health",
                method: "GET",
            };

            await manager.createEndpoint("user-1", input);

            expect(mockJobsRepo.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "Health check",
                    baselineIntervalMs: 30_000,
                    // nextRunAt should be clock.now() + 30s
                    nextRunAt: new Date("2025-01-14T12:00:30Z"),
                }),
            );
        });

        it("throws if jobId provided but job not found", async () => {
            const input: CreateEndpointInput = {
                name: "Test",
                jobId: "nonexistent-job",
                baselineIntervalMs: 30_000, // Add required baseline schedule
                url: "https://api.example.com/test",
                method: "GET",
            };

            vi.mocked(mockJobsRepo.getJob).mockResolvedValue(null);

            await expect(manager.createEndpoint("user-1", input)).rejects.toThrow(
                "Job not found or unauthorized",
            );
        });
    });

    describe("getJob", () => {
        it("returns job when user owns it", async () => {
            const mockJob: Job = {
                id: "job-1",
                userId: "user-1",
                name: "My Job",
                status: "active",
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);

            const result = await manager.getJob("user-1", "job-1");

            expect(result).toEqual(mockJob);
        });

        it("returns null when user does not own job", async () => {
            const mockJob: Job = {
                id: "job-1",
                userId: "user-2", // Different user
                name: "Someone else's job",
                status: "active",
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);

            const result = await manager.getJob("user-1", "job-1");

            expect(result).toBeNull();
        });
    });

    describe("listEndpointsByJob", () => {
        it("returns endpoints when user owns job", async () => {
            const mockJob: Job = {
                id: "job-1",
                userId: "user-1",
                name: "My Job",
                status: "active",
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockEndpoints: JobEndpoint[] = [
                {
                    id: "ep-1",
                    jobId: "job-1",
                    tenantId: "user-1",
                    name: "Endpoint 1",
                    nextRunAt: new Date(),
                    failureCount: 0,
                },
            ];

            vi.mocked(mockJobsRepo.getJob).mockResolvedValue(mockJob);
            vi.mocked(mockJobsRepo.listEndpointsByJob).mockResolvedValue(mockEndpoints);

            const result = await manager.listEndpointsByJob("user-1", "job-1");

            expect(result).toEqual(mockEndpoints);
        });

        it("throws when user does not own job", async () => {
            vi.mocked(mockJobsRepo.getJob).mockResolvedValue(null);

            await expect(manager.listEndpointsByJob("user-1", "job-1")).rejects.toThrow(
                "Job not found or unauthorized",
            );
        });
    });

    describe("validation", () => {
        it("validates job name is required", async () => {
            await expect(
                manager.createJob("user-1", { name: "" }),
            ).rejects.toThrow("Job name is required");
        });

        it("validates job name length", async () => {
            await expect(
                manager.createJob("user-1", { name: "a".repeat(256) }),
            ).rejects.toThrow("Job name must be 255 characters or less");
        });

        it("validates endpoint must have baseline schedule", async () => {
            await expect(
                manager.createEndpoint("user-1", {
                    name: "Test",
                    url: "https://api.example.com",
                    method: "GET",
                }),
            ).rejects.toThrow("Endpoint must have either baselineCron or baselineIntervalMs");
        });

        it("validates endpoint cannot have both cron and interval", async () => {
            await expect(
                manager.createEndpoint("user-1", {
                    name: "Test",
                    baselineCron: "*/5 * * * *",
                    baselineIntervalMs: 30_000,
                    url: "https://api.example.com",
                    method: "GET",
                }),
            ).rejects.toThrow("Endpoint cannot have both baselineCron and baselineIntervalMs");
        });

        it("validates URL format", async () => {
            await expect(
                manager.createEndpoint("user-1", {
                    name: "Test",
                    baselineIntervalMs: 30_000,
                    url: "not-a-valid-url",
                    method: "GET",
                }),
            ).rejects.toThrow("Endpoint URL must be a valid URL");
        });

        it("validates minimum interval", async () => {
            await expect(
                manager.createEndpoint("user-1", {
                    name: "Test",
                    baselineIntervalMs: 500, // Less than 1000ms
                    url: "https://api.example.com",
                    method: "GET",
                }),
            ).rejects.toThrow("Baseline interval must be at least 1000ms");
        });
    });

    describe("getEndpoint", () => {
        it("returns endpoint when user owns it", async () => {
            const mockEndpoint: JobEndpoint = {
                id: "ep-1",
                tenantId: "user-1",
                name: "My Endpoint",
                nextRunAt: new Date(),
                failureCount: 0,
            };

            vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);

            const result = await manager.getEndpoint("user-1", "ep-1");

            expect(result).toEqual(mockEndpoint);
        });

        it("returns null when user does not own endpoint", async () => {
            const mockEndpoint: JobEndpoint = {
                id: "ep-1",
                tenantId: "user-2", // Different user
                name: "Someone else's endpoint",
                nextRunAt: new Date(),
                failureCount: 0,
            };

            vi.mocked(mockJobsRepo.getEndpoint).mockResolvedValue(mockEndpoint);

            const result = await manager.getEndpoint("user-1", "ep-1");

            expect(result).toBeNull();
        });
    });
});
