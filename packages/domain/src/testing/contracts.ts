import type { JobEndpoint, JobsRepo, RunsRepo } from "@cronicorn/domain";

import { beforeEach, describe, expect, it } from "vitest";

/**
 * Contract test suite for JobsRepo implementations.
 *
 * This test suite validates that any implementation of JobsRepo
 * adheres to the port contract guarantees. Run this against:
 * - InMemoryJobsRepo (test double)
 * - DrizzleJobsRepo (real DB)
 * - Any future adapters
 *
 * Key guarantees tested:
 * - claimDueEndpoints: atomic, respects pause/locks, idempotent
 * - updateAfterRun: applies failure policies, clears hints
 * - AI steering: nudging, hints, pause control
 */
export function testJobsRepoContract(
  setup: () => { repo: JobsRepo; now: () => Date; setNow: (d: Date) => void },
) {
  describe("JobsRepo contract", () => {
    let repo: JobsRepo;
    let setNow: (d: Date) => void;

    beforeEach(() => {
      const ctx = setup();
      repo = ctx.repo;
      setNow = ctx.setNow;
    });

    describe("add + getEndpoint", () => {
      it("should store and retrieve an endpoint", async () => {
        const ep: JobEndpoint = {
          id: "ep1",
          jobId: "job1",
          tenantId: "tenant1",
          name: "test-endpoint",
          baselineIntervalMs: 60000,
          nextRunAt: new Date("2025-01-01T00:00:00Z"),
          failureCount: 0,
        };

        await repo.addEndpoint(ep);
        const retrieved = await repo.getEndpoint("ep1");

        expect(retrieved).toMatchObject({
          id: "ep1",
          jobId: "job1",
          tenantId: "tenant1",
          name: "test-endpoint",
          baselineIntervalMs: 60000,
          failureCount: 0,
        });
        expect(retrieved.nextRunAt.getTime()).toBe(new Date("2025-01-01T00:00:00Z").getTime());
      });

      it("should throw when endpoint not found", async () => {
        await expect(repo.getEndpoint("nonexistent")).rejects.toThrow(/not found/i);
      });
    });

    describe("claimDueEndpoints", () => {
      it("should claim endpoints that are due now", async () => {
        setNow(new Date("2025-01-01T00:00:00Z"));

        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "past",
          nextRunAt: new Date("2024-12-31T23:59:00Z"),
          failureCount: 0,
        });

        await repo.addEndpoint({
          id: "ep2",
          jobId: "job2",
          tenantId: "t1",
          name: "future",
          nextRunAt: new Date("2025-01-01T01:00:00Z"),
          failureCount: 0,
        });

        const claimed = await repo.claimDueEndpoints(10, 0);
        expect(claimed).toEqual(["ep1"]);
      });

      it("should claim endpoints within time horizon", async () => {
        setNow(new Date("2025-01-01T00:00:00Z"));

        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "within",
          nextRunAt: new Date("2025-01-01T00:00:30Z"),
          failureCount: 0,
        });

        const claimed = await repo.claimDueEndpoints(10, 60000); // 1 minute horizon
        expect(claimed).toEqual(["ep1"]);
      });

      it("should respect limit parameter", async () => {
        setNow(new Date("2025-01-01T00:00:00Z"));

        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "first",
          nextRunAt: new Date("2024-12-31T23:58:00Z"),
          failureCount: 0,
        });

        await repo.addEndpoint({
          id: "ep2",
          jobId: "job2",
          tenantId: "t1",
          name: "second",
          nextRunAt: new Date("2024-12-31T23:59:00Z"),
          failureCount: 0,
        });

        const claimed = await repo.claimDueEndpoints(1, 0);
        expect(claimed).toHaveLength(1);
        expect(claimed[0]).toBe("ep1"); // Earlier one
      });

      it("should skip paused endpoints", async () => {
        setNow(new Date("2025-01-01T00:00:00Z"));

        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "paused",
          nextRunAt: new Date("2024-12-31T23:59:00Z"),
          pausedUntil: new Date("2025-01-01T01:00:00Z"),
          failureCount: 0,
        });

        const claimed = await repo.claimDueEndpoints(10, 0);
        expect(claimed).toEqual([]);
      });

      it("should claim paused endpoint after pause expires", async () => {
        setNow(new Date("2025-01-01T00:00:00Z"));

        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "was-paused",
          nextRunAt: new Date("2024-12-31T23:59:00Z"),
          pausedUntil: new Date("2024-12-31T23:59:30Z"),
          failureCount: 0,
        });

        const claimed = await repo.claimDueEndpoints(10, 0);
        expect(claimed).toEqual(["ep1"]);
      });

      it("should be idempotent (no double-claiming)", async () => {
        setNow(new Date("2025-01-01T00:00:00Z"));

        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "once",
          nextRunAt: new Date("2024-12-31T23:59:00Z"),
          failureCount: 0,
        });

        const claimed1 = await repo.claimDueEndpoints(10, 60000);
        expect(claimed1).toEqual(["ep1"]);

        const claimed2 = await repo.claimDueEndpoints(10, 60000);
        expect(claimed2).toEqual([]); // Already locked
      });
    });

    describe("updateAfterRun", () => {
      it("should update lastRunAt, nextRunAt, and clear lock", async () => {
        setNow(new Date("2025-01-01T00:00:00Z"));

        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "test",
          nextRunAt: new Date("2025-01-01T00:00:00Z"),
          failureCount: 0,
        });

        await repo.setLock("ep1", new Date("2025-01-01T00:10:00Z"));

        await repo.updateAfterRun("ep1", {
          lastRunAt: new Date("2025-01-01T00:00:00Z"),
          nextRunAt: new Date("2025-01-01T00:05:00Z"),
          status: { status: "success", durationMs: 1000 },
          failureCountPolicy: "reset",
          clearExpiredHints: false,
        });

        const ep = await repo.getEndpoint("ep1");
        expect(ep.lastRunAt?.getTime()).toBe(new Date("2025-01-01T00:00:00Z").getTime());
        expect(ep.nextRunAt.getTime()).toBe(new Date("2025-01-01T00:05:00Z").getTime());
      });

      it("should reset failure count on success", async () => {
        setNow(new Date("2025-01-01T00:00:00Z"));

        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "test",
          nextRunAt: new Date("2025-01-01T00:00:00Z"),
          failureCount: 3,
        });

        await repo.updateAfterRun("ep1", {
          lastRunAt: new Date("2025-01-01T00:00:00Z"),
          nextRunAt: new Date("2025-01-01T00:05:00Z"),
          status: { status: "success", durationMs: 1000 },
          failureCountPolicy: "reset",
          clearExpiredHints: false,
        });

        const ep = await repo.getEndpoint("ep1");
        expect(ep.failureCount).toBe(0);
      });

      it("should increment failure count on failure", async () => {
        setNow(new Date("2025-01-01T00:00:00Z"));

        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "test",
          nextRunAt: new Date("2025-01-01T00:00:00Z"),
          failureCount: 2,
        });

        await repo.updateAfterRun("ep1", {
          lastRunAt: new Date("2025-01-01T00:00:00Z"),
          nextRunAt: new Date("2025-01-01T00:05:00Z"),
          status: { status: "failed", durationMs: 500 },
          failureCountPolicy: "increment",
          clearExpiredHints: false,
        });

        const ep = await repo.getEndpoint("ep1");
        expect(ep.failureCount).toBe(3);
      });

      it("should clear expired AI hints", async () => {
        setNow(new Date("2025-01-01T00:00:00Z"));

        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "test",
          nextRunAt: new Date("2025-01-01T00:00:00Z"),
          aiHintIntervalMs: 30000,
          aiHintExpiresAt: new Date("2024-12-31T23:59:00Z"), // Expired
          failureCount: 0,
        });

        await repo.updateAfterRun("ep1", {
          lastRunAt: new Date("2025-01-01T00:00:00Z"),
          nextRunAt: new Date("2025-01-01T00:05:00Z"),
          status: { status: "success", durationMs: 1000 },
          failureCountPolicy: "reset",
          clearExpiredHints: true,
        });

        const ep = await repo.getEndpoint("ep1");
        expect(ep.aiHintIntervalMs).toBeUndefined();
        expect(ep.aiHintExpiresAt).toBeUndefined();
      });

      it("should not clear non-expired AI hints", async () => {
        setNow(new Date("2025-01-01T00:00:00Z"));

        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "test",
          nextRunAt: new Date("2025-01-01T00:00:00Z"),
          aiHintIntervalMs: 30000,
          aiHintExpiresAt: new Date("2025-01-01T01:00:00Z"), // Future
          failureCount: 0,
        });

        await repo.updateAfterRun("ep1", {
          lastRunAt: new Date("2025-01-01T00:00:00Z"),
          nextRunAt: new Date("2025-01-01T00:05:00Z"),
          status: { status: "success", durationMs: 1000 },
          failureCountPolicy: "reset",
          clearExpiredHints: true,
        });

        const ep = await repo.getEndpoint("ep1");
        expect(ep.aiHintIntervalMs).toBe(30000);
        expect(ep.aiHintExpiresAt?.getTime()).toBe(new Date("2025-01-01T01:00:00Z").getTime());
      });
    });

    describe("AI steering - writeAIHint", () => {
      it("should write interval hint", async () => {
        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "test",
          nextRunAt: new Date("2025-01-01T00:00:00Z"),
          failureCount: 0,
        });

        await repo.writeAIHint("ep1", {
          intervalMs: 30000,
          expiresAt: new Date("2025-01-01T01:00:00Z"),
          reason: "AI suggested",
        });

        const ep = await repo.getEndpoint("ep1");
        expect(ep.aiHintIntervalMs).toBe(30000);
        expect(ep.aiHintExpiresAt?.getTime()).toBe(new Date("2025-01-01T01:00:00Z").getTime());
        expect(ep.aiHintReason).toBe("AI suggested");
      });

      it("should write one-shot hint", async () => {
        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "test",
          nextRunAt: new Date("2025-01-01T00:00:00Z"),
          failureCount: 0,
        });

        await repo.writeAIHint("ep1", {
          nextRunAt: new Date("2025-01-01T00:02:00Z"),
          expiresAt: new Date("2025-01-01T01:00:00Z"),
        });

        const ep = await repo.getEndpoint("ep1");
        expect(ep.aiHintNextRunAt?.getTime()).toBe(new Date("2025-01-01T00:02:00Z").getTime());
        expect(ep.aiHintExpiresAt?.getTime()).toBe(new Date("2025-01-01T01:00:00Z").getTime());
      });
    });

    describe("AI steering - setNextRunAtIfEarlier", () => {
      it("should nudge nextRunAt to earlier time", async () => {
        setNow(new Date("2025-01-01T00:00:00Z"));

        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "test",
          nextRunAt: new Date("2025-01-01T00:10:00Z"),
          lastRunAt: new Date("2025-01-01T00:00:00Z"),
          failureCount: 0,
        });

        await repo.setNextRunAtIfEarlier("ep1", new Date("2025-01-01T00:05:00Z"));

        const ep = await repo.getEndpoint("ep1");
        expect(ep.nextRunAt.getTime()).toBe(new Date("2025-01-01T00:05:00Z").getTime());
      });

      it("should not nudge to later time", async () => {
        setNow(new Date("2025-01-01T00:00:00Z"));

        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "test",
          nextRunAt: new Date("2025-01-01T00:05:00Z"),
          lastRunAt: new Date("2025-01-01T00:00:00Z"),
          failureCount: 0,
        });

        await repo.setNextRunAtIfEarlier("ep1", new Date("2025-01-01T00:10:00Z"));

        const ep = await repo.getEndpoint("ep1");
        expect(ep.nextRunAt.getTime()).toBe(new Date("2025-01-01T00:05:00Z").getTime());
      });

      it("should clamp to minIntervalMs", async () => {
        setNow(new Date("2025-01-01T00:00:00Z"));

        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "test",
          nextRunAt: new Date("2025-01-01T00:10:00Z"),
          lastRunAt: new Date("2025-01-01T00:00:00Z"),
          minIntervalMs: 60000, // 1 minute
          failureCount: 0,
        });

        // Try to nudge to 30 seconds from now
        await repo.setNextRunAtIfEarlier("ep1", new Date("2025-01-01T00:00:30Z"));

        const ep = await repo.getEndpoint("ep1");
        // Should be clamped to 1 minute from now
        expect(ep.nextRunAt.getTime()).toBe(new Date("2025-01-01T00:01:00Z").getTime());
      });

      it("should clamp to maxIntervalMs", async () => {
        setNow(new Date("2025-01-01T00:00:00Z"));

        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "test",
          nextRunAt: new Date("2025-01-01T00:10:00Z"),
          lastRunAt: new Date("2025-01-01T00:00:00Z"),
          maxIntervalMs: 120000, // 2 minutes
          failureCount: 0,
        });

        // Try to nudge to 5 minutes from now (beyond max)
        await repo.setNextRunAtIfEarlier("ep1", new Date("2025-01-01T00:05:00Z"));

        const ep = await repo.getEndpoint("ep1");
        // Should be clamped to 2 minutes from now (max interval)
        expect(ep.nextRunAt.getTime()).toBe(new Date("2025-01-01T00:02:00Z").getTime());
      });

      it("should not nudge paused endpoint", async () => {
        setNow(new Date("2025-01-01T00:00:00Z"));

        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "test",
          nextRunAt: new Date("2025-01-01T00:10:00Z"),
          pausedUntil: new Date("2025-01-01T01:00:00Z"),
          failureCount: 0,
        });

        await repo.setNextRunAtIfEarlier("ep1", new Date("2025-01-01T00:05:00Z"));

        const ep = await repo.getEndpoint("ep1");
        expect(ep.nextRunAt.getTime()).toBe(new Date("2025-01-01T00:10:00Z").getTime());
      });
    });

    describe("AI steering - setPausedUntil", () => {
      it("should pause endpoint", async () => {
        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "test",
          nextRunAt: new Date("2025-01-01T00:00:00Z"),
          failureCount: 0,
        });

        await repo.setPausedUntil("ep1", new Date("2025-01-01T01:00:00Z"));

        const ep = await repo.getEndpoint("ep1");
        expect(ep.pausedUntil?.getTime()).toBe(new Date("2025-01-01T01:00:00Z").getTime());
      });

      it("should resume endpoint (null pause)", async () => {
        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "test",
          nextRunAt: new Date("2025-01-01T00:00:00Z"),
          pausedUntil: new Date("2025-01-01T01:00:00Z"),
          failureCount: 0,
        });

        await repo.setPausedUntil("ep1", null);

        const ep = await repo.getEndpoint("ep1");
        expect(ep.pausedUntil).toBeUndefined();
      });
    });

    describe("locking", () => {
      it("should lock and unlock endpoint", async () => {
        setNow(new Date("2025-01-01T00:00:00Z"));

        await repo.addEndpoint({
          id: "ep1",
          jobId: "job1",
          tenantId: "t1",
          name: "test",
          nextRunAt: new Date("2025-01-01T00:00:00Z"),
          failureCount: 0,
        });

        await repo.setLock("ep1", new Date("2025-01-01T00:10:00Z"));
        const claimed1 = await repo.claimDueEndpoints(10, 0);
        expect(claimed1).toEqual([]);

        await repo.clearLock("ep1");
        const claimed2 = await repo.claimDueEndpoints(10, 0);
        expect(claimed2).toEqual(["ep1"]);
      });
    });
  });
}

/**
 * Contract test suite for RunsRepo implementations.
 */
export function testRunsRepoContract(
  setup: () => { repo: RunsRepo },
) {
  describe("RunsRepo contract", () => {
    let repo: RunsRepo;

    beforeEach(() => {
      const ctx = setup();
      repo = ctx.repo;
    });

    it("should create and finish a run", async () => {
      const runId = await repo.create({
        endpointId: "ep1",
        status: "running",
        attempt: 1,
      });

      expect(runId).toBeDefined();
      expect(typeof runId).toBe("string");

      await repo.finish(runId, {
        status: "success",
        durationMs: 1000,
      });
    });

    it("should handle failure with error", async () => {
      const runId = await repo.create({
        endpointId: "ep1",
        status: "running",
        attempt: 1,
      });

      await repo.finish(runId, {
        status: "failed",
        durationMs: 500,
        err: new Error("Test error"),
      });
    });

    it("should throw when finishing nonexistent run", async () => {
      await expect(
        repo.finish("nonexistent", {
          status: "success",
          durationMs: 1000,
        }),
      ).rejects.toThrow(/not found/i);
    });
  });
}
