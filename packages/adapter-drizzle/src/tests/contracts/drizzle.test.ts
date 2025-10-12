import { afterAll, describe } from "vitest";

import { DrizzleJobsRepo, DrizzleRunsRepo } from "../../src/index.js";
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
    test("should create and retrieve endpoint", async ({ tx }) => {
      const repo = new DrizzleJobsRepo(tx, () => new Date());

      await repo.add({
        id: "ep1",
        jobId: "job1",
        tenantId: "tenant1",
        name: "test",
        nextRunAt: new Date("2025-01-01T00:00:00Z"),
        failureCount: 0,
      });

      const retrieved = await repo.getEndpoint("ep1");
      expect(retrieved.id).toBe("ep1");
      expect(retrieved.name).toBe("test");
    });
  });

  describe("drizzleRunsRepo", () => {
    test("should create and finish a run", async ({ tx }) => {
      // First create an endpoint (foreign key requirement)
      const jobsRepo = new DrizzleJobsRepo(tx, () => new Date());
      await jobsRepo.add({
        id: "ep1",
        jobId: "job1",
        tenantId: "tenant1",
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
  });
});
