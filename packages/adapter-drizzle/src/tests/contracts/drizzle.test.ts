import { afterAll, describe } from "vitest";

import { DrizzleJobsRepo, DrizzleRunsRepo } from "../../index.js";
import { closeTestPool, expect, test } from "../fixtures.js";

/**
 * Run contract tests against DrizzleJobsRepo with real PostgreSQL.
 *
 * Uses transaction-per-test pattern for isolation via Vitest fixtures.
 * Each test gets a fresh transaction that is rolled back after the test.
 *
 * Requires DATABASE_URL environment variable (loaded from .env.test by vitest).
 *
 * Setup:
 * 1. Copy .env.test.example to .env.test
 * 2. Set DATABASE_URL in .env.test
 * 3. Run: pnpm test
 */

describe("drizzle Repos (PostgreSQL)", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  describe("drizzleJobsRepo", () => {
    test("should add and retrieve endpoint", async ({ tx }) => {
      const repo = new DrizzleJobsRepo(tx, () => new Date());

      // Create job first (foreign key requirement)
      const job = await repo.createJob({
        userId: "tenant1",
        name: "Test Job",
        status: "active",
      });

      await repo.addEndpoint({
        id: "ep1",
        tenantId: "tenant1",
        jobId: job.id,
        name: "test endpoint",
        nextRunAt: new Date("2025-01-01T00:00:00Z"),
        failureCount: 0,
      });

      const retrieved = await repo.getEndpoint("ep1");
      expect(retrieved?.id).toBe("ep1");
      expect(retrieved?.name).toBe("test endpoint");
      expect(retrieved?.tenantId).toBe("tenant1");
    });

    test("should update endpoint with partial data", async ({ tx }) => {
      const repo = new DrizzleJobsRepo(tx, () => new Date());

      const job = await repo.createJob({
        userId: "tenant1",
        name: "Test Job",
        status: "active",
      });

      await repo.addEndpoint({
        id: "ep1",
        tenantId: "tenant1",
        jobId: job.id,
        name: "original name",
        nextRunAt: new Date("2025-01-01T00:00:00Z"),
        failureCount: 0,
      });

      const updated = await repo.updateEndpoint("ep1", {
        name: "updated name",
        baselineIntervalMs: 60_000,
      });

      expect(updated.name).toBe("updated name");
      expect(updated.baselineIntervalMs).toBe(60_000);
    });

    test("should clear AI hints", async ({ tx }) => {
      const repo = new DrizzleJobsRepo(tx, () => new Date());

      const job = await repo.createJob({
        userId: "tenant1",
        name: "Test Job",
        status: "active",
      });

      await repo.addEndpoint({
        id: "ep1",
        tenantId: "tenant1",
        jobId: job.id,
        name: "test",
        nextRunAt: new Date("2025-01-01T00:00:00Z"),
        failureCount: 0,
        aiHintIntervalMs: 30_000,
        aiHintExpiresAt: new Date("2025-01-02T00:00:00Z"),
      });

      await repo.clearAIHints("ep1");

      const retrieved = await repo.getEndpoint("ep1");
      expect(retrieved?.aiHintIntervalMs).toBeUndefined();
      expect(retrieved?.aiHintNextRunAt).toBeUndefined();
      expect(retrieved?.aiHintExpiresAt).toBeUndefined();
    });

    test("should reset failure count", async ({ tx }) => {
      const repo = new DrizzleJobsRepo(tx, () => new Date());

      const job = await repo.createJob({
        userId: "tenant1",
        name: "Test Job",
        status: "active",
      });

      await repo.addEndpoint({
        id: "ep1",
        tenantId: "tenant1",
        jobId: job.id,
        name: "test",
        nextRunAt: new Date("2025-01-01T00:00:00Z"),
        failureCount: 5,
      });

      await repo.resetFailureCount("ep1");

      const retrieved = await repo.getEndpoint("ep1");
      expect(retrieved?.failureCount).toBe(0);
    });
  });

  describe("drizzleRunsRepo", () => {
    test("should create and finish a run", async ({ tx }) => {
      const jobsRepo = new DrizzleJobsRepo(tx, () => new Date());

      const job = await jobsRepo.createJob({
        userId: "tenant1",
        name: "Test Job",
        status: "active",
      });

      await jobsRepo.addEndpoint({
        id: "ep1",
        tenantId: "tenant1",
        jobId: job.id,
        name: "test",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      const repo = new DrizzleRunsRepo(tx);

      const runId = await repo.create({
        endpointId: "ep1",
        status: "running",
        attempt: 1,
      });

      expect(runId).toBeDefined();

      await repo.finish(runId, {
        status: "success",
        durationMs: 100,
      });
    });

    test("should list runs with pagination", async ({ tx }) => {
      const jobsRepo = new DrizzleJobsRepo(tx, () => new Date());

      const job = await jobsRepo.createJob({
        userId: "user1",
        name: "Test Job",
        status: "active",
      });

      await jobsRepo.addEndpoint({
        id: "ep1",
        tenantId: "user1",
        jobId: job.id,
        name: "test",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      const repo = new DrizzleRunsRepo(tx);

      const run1 = await repo.create({ endpointId: "ep1", status: "running", attempt: 1 });
      await repo.finish(run1, { status: "success", durationMs: 100 });

      const run2 = await repo.create({ endpointId: "ep1", status: "running", attempt: 1 });
      await repo.finish(run2, { status: "success", durationMs: 100 });

      const run3 = await repo.create({ endpointId: "ep1", status: "running", attempt: 1 });
      await repo.finish(run3, { status: "failed", durationMs: 100 });

      const result = await repo.listRuns({
        userId: "user1",
        endpointId: "ep1",
        limit: 10,
        offset: 0,
      });

      expect(result.runs.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    test("should filter runs by status", async ({ tx }) => {
      const jobsRepo = new DrizzleJobsRepo(tx, () => new Date());

      const job = await jobsRepo.createJob({
        userId: "user1",
        name: "Test Job",
        status: "active",
      });

      await jobsRepo.addEndpoint({
        id: "ep1",
        tenantId: "user1",
        jobId: job.id,
        name: "test",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      const repo = new DrizzleRunsRepo(tx);

      const run1 = await repo.create({ endpointId: "ep1", status: "running", attempt: 1 });
      await repo.finish(run1, { status: "success", durationMs: 100 });

      const run2 = await repo.create({ endpointId: "ep1", status: "running", attempt: 1 });
      await repo.finish(run2, { status: "failed", durationMs: 100 });

      const failedRuns = await repo.listRuns({
        userId: "user1",
        status: "failed",
      });

      expect(failedRuns.runs.every(r => r.status === "failed")).toBe(true);
    });

    test("should get run details with attempt", async ({ tx }) => {
      const jobsRepo = new DrizzleJobsRepo(tx, () => new Date());

      const job = await jobsRepo.createJob({
        userId: "user1",
        name: "Test Job",
        status: "active",
      });

      await jobsRepo.addEndpoint({
        id: "ep1",
        tenantId: "user1",
        jobId: job.id,
        name: "test",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      const repo = new DrizzleRunsRepo(tx);

      const runId = await repo.create({
        endpointId: "ep1",
        status: "running",
        attempt: 2,
      });

      await repo.finish(runId, {
        status: "success",
        durationMs: 150,
      });

      const details = await repo.getRunDetails(runId);

      expect(details?.id).toBe(runId);
      expect(details?.attempt).toBe(2);
      expect(details?.durationMs).toBe(150);
    });

    test("should get health summary", async ({ tx }) => {
      const jobsRepo = new DrizzleJobsRepo(tx, () => new Date());

      const job = await jobsRepo.createJob({
        userId: "user1",
        name: "Test Job",
        status: "active",
      });

      await jobsRepo.addEndpoint({
        id: "ep1",
        tenantId: "user1",
        jobId: job.id,
        name: "test",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      const repo = new DrizzleRunsRepo(tx);

      for (let i = 0; i < 3; i++) {
        const runId = await repo.create({ endpointId: "ep1", status: "running", attempt: 1 });
        await repo.finish(runId, { status: "success", durationMs: 100 + i * 50 });
      }

      const failedRun = await repo.create({ endpointId: "ep1", status: "running", attempt: 1 });
      await repo.finish(failedRun, { status: "failed", durationMs: 50 });

      const summary = await repo.getHealthSummary("ep1", new Date("2020-01-01"));

      expect(summary.successCount).toBe(3);
      expect(summary.failureCount).toBe(1);
      expect(summary.avgDurationMs).toBeGreaterThan(0);
    });

    // ============================================================================
    // AI Query Tools: Response Data Retrieval Tests
    // ============================================================================

    test("should get latest response for endpoint", async ({ tx }) => {
      const jobsRepo = new DrizzleJobsRepo(tx, () => new Date());

      const job = await jobsRepo.createJob({
        userId: "user1",
        name: "Test Job",
        status: "active",
      });

      await jobsRepo.addEndpoint({
        id: "ep1",
        tenantId: "user1",
        jobId: job.id,
        name: "test",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      const repo = new DrizzleRunsRepo(tx);

      // Create first run
      const run1 = await repo.create({ endpointId: "ep1", status: "running", attempt: 1 });
      await repo.finish(run1, {
        status: "success",
        durationMs: 100,
        responseBody: { count: 42 },
        statusCode: 200,
      });

      // Create second run (should be latest)
      const run2 = await repo.create({ endpointId: "ep1", status: "running", attempt: 1 });
      await repo.finish(run2, {
        status: "success",
        durationMs: 120,
        responseBody: { count: 50 },
        statusCode: 200,
      });

      const latest = await repo.getLatestResponse("ep1");

      expect(latest).toBeDefined();
      expect(latest?.responseBody).toEqual({ count: 50 });
      expect(latest?.status).toBe("success");
      expect(latest?.timestamp).toBeDefined();
    });

    test("should return null when no runs exist", async ({ tx }) => {
      const repo = new DrizzleRunsRepo(tx);
      const latest = await repo.getLatestResponse("nonexistent");

      expect(latest).toBeNull();
    });

    test("should get response history with limit", async ({ tx }) => {
      const jobsRepo = new DrizzleJobsRepo(tx, () => new Date());

      const job = await jobsRepo.createJob({
        userId: "user1",
        name: "Test Job",
        status: "active",
      });

      await jobsRepo.addEndpoint({
        id: "ep1",
        tenantId: "user1",
        jobId: job.id,
        name: "test",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      const repo = new DrizzleRunsRepo(tx);

      // Create 5 runs
      for (let i = 0; i < 5; i++) {
        const runId = await repo.create({ endpointId: "ep1", status: "running", attempt: 1 });
        await repo.finish(runId, {
          status: "success",
          durationMs: 100 + i * 10,
          responseBody: { iteration: i },
          statusCode: 200,
        });
      }

      const history = await repo.getResponseHistory("ep1", 3);

      expect(history.length).toBe(3);
      // Should be newest first
      expect(history[0].responseBody).toEqual({ iteration: 4 });
      expect(history[1].responseBody).toEqual({ iteration: 3 });
      expect(history[2].responseBody).toEqual({ iteration: 2 });
    });

    test("should clamp response history limit to 50", async ({ tx }) => {
      const jobsRepo = new DrizzleJobsRepo(tx, () => new Date());

      const job = await jobsRepo.createJob({
        userId: "user1",
        name: "Test Job",
        status: "active",
      });

      await jobsRepo.addEndpoint({
        id: "ep1",
        tenantId: "user1",
        jobId: job.id,
        name: "test",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      const repo = new DrizzleRunsRepo(tx);

      // Create 60 runs
      for (let i = 0; i < 60; i++) {
        const runId = await repo.create({ endpointId: "ep1", status: "running", attempt: 1 });
        await repo.finish(runId, {
          status: "success",
          durationMs: 100,
          responseBody: { iteration: i },
          statusCode: 200,
        });
      }

      // Request 100, should get max 50
      const history = await repo.getResponseHistory("ep1", 100);

      expect(history.length).toBe(50);
    });

    test("should handle null response bodies in history", async ({ tx }) => {
      const jobsRepo = new DrizzleJobsRepo(tx, () => new Date());

      const job = await jobsRepo.createJob({
        userId: "user1",
        name: "Test Job",
        status: "active",
      });

      await jobsRepo.addEndpoint({
        id: "ep1",
        tenantId: "user1",
        jobId: job.id,
        name: "test",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      const repo = new DrizzleRunsRepo(tx);

      // Run without response body
      const run1 = await repo.create({ endpointId: "ep1", status: "running", attempt: 1 });
      await repo.finish(run1, {
        status: "success",
        durationMs: 100,
      });

      // Run with response body
      const run2 = await repo.create({ endpointId: "ep1", status: "running", attempt: 1 });
      await repo.finish(run2, {
        status: "success",
        durationMs: 120,
        responseBody: { data: "test" },
        statusCode: 200,
      });

      const history = await repo.getResponseHistory("ep1", 10);

      expect(history.length).toBe(2);
      expect(history[0].responseBody).toEqual({ data: "test" });
      expect(history[1].responseBody).toBeNull();
    });

    test("should get sibling latest responses", async ({ tx }) => {
      const jobsRepo = new DrizzleJobsRepo(tx, () => new Date());

      const job = await jobsRepo.createJob({
        userId: "user1",
        name: "Multi-Endpoint Job",
        status: "active",
      });

      // Create 3 endpoints in same job
      await jobsRepo.addEndpoint({
        id: "ep1",
        tenantId: "user1",
        jobId: job.id,
        name: "Endpoint 1",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      await jobsRepo.addEndpoint({
        id: "ep2",
        tenantId: "user1",
        jobId: job.id,
        name: "Endpoint 2",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      await jobsRepo.addEndpoint({
        id: "ep3",
        tenantId: "user1",
        jobId: job.id,
        name: "Endpoint 3",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      const repo = new DrizzleRunsRepo(tx);

      // Create runs for ep2 and ep3 (not ep1, which will be the "current" endpoint)
      const run2 = await repo.create({ endpointId: "ep2", status: "running", attempt: 1 });
      await repo.finish(run2, {
        status: "success",
        durationMs: 100,
        responseBody: { source: "ep2" },
        statusCode: 200,
      });

      const run3 = await repo.create({ endpointId: "ep3", status: "running", attempt: 1 });
      await repo.finish(run3, {
        status: "failed",
        durationMs: 50,
        responseBody: { error: "Something went wrong" },
        statusCode: 500,
      });

      // Get siblings from perspective of ep1 (should return ep2 and ep3)
      const siblings = await repo.getSiblingLatestResponses(job.id, "ep1");

      expect(siblings.length).toBe(2);

      const ep2Data = siblings.find(s => s.endpointId === "ep2");
      expect(ep2Data?.endpointName).toBe("Endpoint 2");
      expect(ep2Data?.responseBody).toEqual({ source: "ep2" });
      expect(ep2Data?.status).toBe("success");

      const ep3Data = siblings.find(s => s.endpointId === "ep3");
      expect(ep3Data?.endpointName).toBe("Endpoint 3");
      expect(ep3Data?.responseBody).toEqual({ error: "Something went wrong" });
      expect(ep3Data?.status).toBe("failed");
    });

    test("should exclude current endpoint from siblings", async ({ tx }) => {
      const jobsRepo = new DrizzleJobsRepo(tx, () => new Date());

      const job = await jobsRepo.createJob({
        userId: "user1",
        name: "Test Job",
        status: "active",
      });

      await jobsRepo.addEndpoint({
        id: "ep1",
        tenantId: "user1",
        jobId: job.id,
        name: "Endpoint 1",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      await jobsRepo.addEndpoint({
        id: "ep2",
        tenantId: "user1",
        jobId: job.id,
        name: "Endpoint 2",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      const repo = new DrizzleRunsRepo(tx);

      // Create runs for both endpoints
      const run1 = await repo.create({ endpointId: "ep1", status: "running", attempt: 1 });
      await repo.finish(run1, {
        status: "success",
        durationMs: 100,
        responseBody: { source: "ep1" },
        statusCode: 200,
      });

      const run2 = await repo.create({ endpointId: "ep2", status: "running", attempt: 1 });
      await repo.finish(run2, {
        status: "success",
        durationMs: 100,
        responseBody: { source: "ep2" },
        statusCode: 200,
      });

      // From perspective of ep1, should only see ep2
      const siblings = await repo.getSiblingLatestResponses(job.id, "ep1");

      expect(siblings.length).toBe(1);
      expect(siblings[0].endpointId).toBe("ep2");
      expect(siblings.find(s => s.endpointId === "ep1")).toBeUndefined();
    });

    test("should return empty array when no siblings have runs", async ({ tx }) => {
      const jobsRepo = new DrizzleJobsRepo(tx, () => new Date());

      const job = await jobsRepo.createJob({
        userId: "user1",
        name: "Test Job",
        status: "active",
      });

      await jobsRepo.addEndpoint({
        id: "ep1",
        tenantId: "user1",
        jobId: job.id,
        name: "Endpoint 1",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      await jobsRepo.addEndpoint({
        id: "ep2",
        tenantId: "user1",
        jobId: job.id,
        name: "Endpoint 2",
        nextRunAt: new Date(),
        failureCount: 0,
      });

      const repo = new DrizzleRunsRepo(tx);

      // No runs created for any endpoint
      const siblings = await repo.getSiblingLatestResponses(job.id, "ep1");

      expect(siblings.length).toBe(0);
    });
  });
});
