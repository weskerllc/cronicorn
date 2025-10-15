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
  });
});
