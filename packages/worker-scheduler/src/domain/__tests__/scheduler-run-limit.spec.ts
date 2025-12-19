/**
 * Scheduler execution metering tests
 *
 * Verifies that the scheduler enforces monthly run limits per tier:
 * - Free: 10,000 runs/month
 * - Pro: 100,000 runs/month
 * - Enterprise: 1,000,000 runs/month
 *
 * When a user's monthly run count exceeds the tier limit, the scheduler
 * defers the execution to the start of the next month (soft limit behavior).
 */

import type { Cron, Dispatcher, JobEndpoint, JobsRepo, RunsRepo } from "@cronicorn/domain";

import { FakeLogger } from "@cronicorn/domain";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Scheduler } from "../scheduler.js";

class FakeClock {
  private currentTime: Date;

  constructor(initialTime: Date = new Date("2025-01-15T12:00:00Z")) {
    this.currentTime = new Date(initialTime);
  }

  now(): Date {
    return new Date(this.currentTime);
  }

  async sleep(_ms: number): Promise<void> {
    // No-op for tests
  }

  advance(ms: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + ms);
  }

  set(time: Date): void {
    this.currentTime = new Date(time);
  }

  toMonth(): string {
    return `${this.currentTime.getUTCFullYear()}-${String(this.currentTime.getUTCMonth() + 1).padStart(2, "0")}`;
  }
}

describe("scheduler - execution metering (monthly run limits)", () => {
  let clock: FakeClock;
  let jobs: JobsRepo;
  let runs: RunsRepo;
  let dispatcher: Dispatcher;
  let cron: Cron;
  let logger: FakeLogger;
  let scheduler: Scheduler;

  let mockEndpoint: JobEndpoint;

  beforeEach(() => {
    clock = new FakeClock(new Date("2025-01-15T12:00:00Z"));
    logger = new FakeLogger();

    mockEndpoint = {
      id: "ep1",
      jobId: "job1",
      tenantId: "tenant-free",
      name: "test-endpoint",
      baselineIntervalMs: 60_000, // 1 minute
      nextRunAt: new Date("2025-01-15T12:00:00Z"),
      lastRunAt: new Date("2025-01-15T11:59:00Z"),
      failureCount: 0,
    };

    // Mock jobs repo
    // eslint-disable-next-line ts/consistent-type-assertions
    jobs = {
      claimDueEndpoints: vi.fn().mockResolvedValue(["ep1"]),
      getEndpoint: vi.fn().mockResolvedValue(mockEndpoint),
      updateAfterRun: vi.fn().mockResolvedValue(undefined),
      setNextRunAtIfEarlier: vi.fn().mockResolvedValue(undefined),
      getUserTier: vi.fn().mockResolvedValue("free"),
    } as unknown as JobsRepo;

    // Mock runs repo with configurable metrics
    const metricsOverride = { totalRuns: 0 };

    // eslint-disable-next-line ts/consistent-type-assertions
    runs = {
      create: vi.fn().mockResolvedValue("run1"),
      finish: vi.fn().mockResolvedValue(undefined),
      getFilteredMetrics: vi.fn().mockImplementation(
        async (filters: { userId: string; sinceDate?: Date }): Promise<{
          totalRuns: number;
          successCount: number;
          failureCount: number;
          avgDurationMs: number | null;
        }> => {
          void filters; // unused, for proper typing
          return {
            totalRuns: metricsOverride.totalRuns,
            successCount: metricsOverride.totalRuns,
            failureCount: 0,
            avgDurationMs: 100,
          };
        },
      ),
    } as unknown as RunsRepo;

    // Mock dispatcher - always succeeds instantly
    // eslint-disable-next-line ts/consistent-type-assertions
    dispatcher = {
      execute: vi.fn().mockResolvedValue({
        status: "success" as const,
        durationMs: 10,
      }),
    } as unknown as Dispatcher;

    // Mock cron - returns 1 minute later
    // eslint-disable-next-line ts/consistent-type-assertions
    cron = {
      next: vi.fn().mockImplementation((_expr: string, from: Date) => {
        return new Date(from.getTime() + 60_000);
      }),
    } as unknown as Cron;

    scheduler = new Scheduler({
      clock,
      jobs,
      runs,
      dispatcher,
      cron,
      logger,
    });
  });

  describe("free tier limit (10k runs/month)", () => {
    beforeEach(() => {
      vi.mocked(jobs.getUserTier).mockResolvedValue("free");
    });

    it("should execute normally when under limit", async () => {
      // 9,999 runs this month (below 10k limit)
      vi.mocked(runs.getFilteredMetrics).mockResolvedValue({
        totalRuns: 9_999,
        successCount: 9_999,
        failureCount: 0,
        avgDurationMs: 100,
      });

      await scheduler.tick(10, 10_000);

      // Should execute normally
      expect(dispatcher.execute).toHaveBeenCalledWith(mockEndpoint);
      expect(jobs.updateAfterRun).toHaveBeenCalled();
    });

    it("should defer to next month when limit exceeded", async () => {
      // 10,000 runs this month (at limit)
      vi.mocked(runs.getFilteredMetrics).mockResolvedValue({
        totalRuns: 10_000,
        successCount: 10_000,
        failureCount: 0,
        avgDurationMs: 100,
      });

      await scheduler.tick(10, 10_000);

      // Should NOT execute
      expect(dispatcher.execute).not.toHaveBeenCalled();

      // Should defer to start of next month
      expect(jobs.setNextRunAtIfEarlier).toHaveBeenCalledWith(
        "ep1",
        new Date("2025-02-01T00:00:00Z"),
      );
    });

    it("should defer when limit is significantly exceeded", async () => {
      // 15,000 runs (50% over limit)
      vi.mocked(runs.getFilteredMetrics).mockResolvedValue({
        totalRuns: 15_000,
        successCount: 15_000,
        failureCount: 0,
        avgDurationMs: 100,
      });

      await scheduler.tick(10, 10_000);

      // Should still defer to next month (not skip multiple months)
      expect(jobs.setNextRunAtIfEarlier).toHaveBeenCalledWith(
        "ep1",
        new Date("2025-02-01T00:00:00Z"),
      );
    });

    it("should use start of month UTC for next run date", async () => {
      // Test at end of month
      clock.set(new Date("2025-01-31T23:59:59Z"));

      vi.mocked(runs.getFilteredMetrics).mockResolvedValue({
        totalRuns: 10_000,
        successCount: 10_000,
        failureCount: 0,
        avgDurationMs: 100,
      });

      await scheduler.tick(10, 10_000);

      // Should defer to start of next month (Feb 1)
      expect(jobs.setNextRunAtIfEarlier).toHaveBeenCalledWith(
        "ep1",
        new Date("2025-02-01T00:00:00Z"),
      );
    });
  });

  describe("pro tier limit (100k runs/month)", () => {
    beforeEach(() => {
      vi.mocked(jobs.getUserTier).mockResolvedValue("pro");
    });

    it("should execute normally when under pro limit", async () => {
      // 99,999 runs (below 100k limit)
      vi.mocked(runs.getFilteredMetrics).mockResolvedValue({
        totalRuns: 99_999,
        successCount: 99_999,
        failureCount: 0,
        avgDurationMs: 100,
      });

      await scheduler.tick(10, 10_000);

      expect(dispatcher.execute).toHaveBeenCalledWith(mockEndpoint);
    });

    it("should defer when pro limit exceeded", async () => {
      // 100,000 runs (at limit)
      vi.mocked(runs.getFilteredMetrics).mockResolvedValue({
        totalRuns: 100_000,
        successCount: 100_000,
        failureCount: 0,
        avgDurationMs: 100,
      });

      await scheduler.tick(10, 10_000);

      expect(dispatcher.execute).not.toHaveBeenCalled();
      expect(jobs.setNextRunAtIfEarlier).toHaveBeenCalledWith(
        "ep1",
        new Date("2025-02-01T00:00:00Z"),
      );
    });
  });

  describe("enterprise tier limit (1M runs/month)", () => {
    beforeEach(() => {
      vi.mocked(jobs.getUserTier).mockResolvedValue("enterprise");
    });

    it("should execute with very high run counts", async () => {
      // 999,999 runs (below 1M limit)
      vi.mocked(runs.getFilteredMetrics).mockResolvedValue({
        totalRuns: 999_999,
        successCount: 999_999,
        failureCount: 0,
        avgDurationMs: 100,
      });

      await scheduler.tick(10, 10_000);

      expect(dispatcher.execute).toHaveBeenCalledWith(mockEndpoint);
    });

    it("should defer when enterprise limit exceeded", async () => {
      // 1,000,000 runs (at limit)
      vi.mocked(runs.getFilteredMetrics).mockResolvedValue({
        totalRuns: 1_000_000,
        successCount: 1_000_000,
        failureCount: 0,
        avgDurationMs: 100,
      });

      await scheduler.tick(10, 10_000);

      expect(dispatcher.execute).not.toHaveBeenCalled();
      expect(jobs.setNextRunAtIfEarlier).toHaveBeenCalledWith(
        "ep1",
        new Date("2025-02-01T00:00:00Z"),
      );
    });
  });

  describe("boundary conditions", () => {
    beforeEach(() => {
      vi.mocked(jobs.getUserTier).mockResolvedValue("free");
    });

    it("should allow execution at exactly limit - 1", async () => {
      // 9,999 (limit is 10,000)
      vi.mocked(runs.getFilteredMetrics).mockResolvedValue({
        totalRuns: 9_999,
        successCount: 9_999,
        failureCount: 0,
        avgDurationMs: 100,
      });

      await scheduler.tick(10, 10_000);

      expect(dispatcher.execute).toHaveBeenCalledWith(mockEndpoint);
    });

    it("should block at exactly limit", async () => {
      // 10,000 (at limit)
      vi.mocked(runs.getFilteredMetrics).mockResolvedValue({
        totalRuns: 10_000,
        successCount: 10_000,
        failureCount: 0,
        avgDurationMs: 100,
      });

      await scheduler.tick(10, 10_000);

      expect(dispatcher.execute).not.toHaveBeenCalled();
    });

    it("should log warning when limit exceeded", async () => {
      vi.mocked(runs.getFilteredMetrics).mockResolvedValue({
        totalRuns: 10_000,
        successCount: 10_000,
        failureCount: 0,
        avgDurationMs: 100,
      });

      await scheduler.tick(10, 10_000);

      // Verify the endpoint was not executed
      expect(dispatcher.execute).not.toHaveBeenCalled();

      // Verify warning was logged
      const warnLogs = logger.getLogsByLevel("warn");
      expect(warnLogs.length).toBeGreaterThan(0);
      const limitWarning = warnLogs.find(log =>
        log.msg?.includes("Monthly run limit exceeded"),
      );
      expect(limitWarning).toBeDefined();
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      vi.mocked(jobs.getUserTier).mockResolvedValue("free");
    });

    it("should proceed with execution if getFilteredMetrics fails", async () => {
      // Simulate error fetching metrics
      vi.mocked(runs.getFilteredMetrics).mockRejectedValue(new Error("DB error"));

      await scheduler.tick(10, 10_000);

      // Should log error and proceed with execution
      expect(dispatcher.execute).toHaveBeenCalledWith(mockEndpoint);
    });

    it("should handle tier fetch errors gracefully", async () => {
      vi.mocked(jobs.getUserTier).mockRejectedValue(new Error("User lookup failed"));
      vi.mocked(runs.getFilteredMetrics).mockResolvedValue({
        totalRuns: 0,
        successCount: 0,
        failureCount: 0,
        avgDurationMs: null,
      });

      await scheduler.tick(10, 10_000);

      // Should proceed with execution despite tier lookup failure
      expect(dispatcher.execute).toHaveBeenCalledWith(mockEndpoint);
    });
  });

  describe("cross-month behavior", () => {
    beforeEach(() => {
      vi.mocked(jobs.getUserTier).mockResolvedValue("free");
    });

    it("should reset counting at month boundary", async () => {
      // Jan has 10k runs - limit hit
      clock.set(new Date("2025-01-31T23:59:59Z"));
      vi.mocked(runs.getFilteredMetrics).mockResolvedValue({
        totalRuns: 10_000,
        successCount: 10_000,
        failureCount: 0,
        avgDurationMs: 100,
      });

      await scheduler.tick(10, 10_000);
      expect(dispatcher.execute).not.toHaveBeenCalled();

      // Advance to Feb - getFilteredMetrics now called with new sinceDate
      clock.set(new Date("2025-02-01T00:00:01Z"));

      // Feb has 0 runs so far
      vi.mocked(runs.getFilteredMetrics).mockResolvedValue({
        totalRuns: 5,
        successCount: 5,
        failureCount: 0,
        avgDurationMs: 100,
      });

      await scheduler.tick(10, 10_000);

      // Should execute because we're in new month with fresh count
      expect(dispatcher.execute).toHaveBeenCalled();
    });
  });
});
