/**
 * Scheduler timing tests
 *
 * These tests verify that the scheduler correctly handles various execution timing scenarios,
 * including cases where execution takes longer than the scheduled interval.
 */

import type { Cron, Dispatcher, JobEndpoint, JobsRepo, RunsRepo } from "@cronicorn/domain";

import { FakeLogger } from "@cronicorn/domain";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Scheduler } from "../scheduler.js";

// Test helpers
class FakeClock {
  private currentTime: Date;

  constructor(initialTime: Date = new Date("2025-01-01T00:00:00Z")) {
    this.currentTime = initialTime;
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
}

describe("scheduler - timing edge cases", () => {
  let clock: FakeClock;
  let jobs: JobsRepo;
  let runs: RunsRepo;
  let dispatcher: Dispatcher;
  let cron: Cron;
  let logger: FakeLogger;
  let scheduler: Scheduler;

  let mockEndpoint: JobEndpoint;
  let executionDurationMs: number;

  beforeEach(() => {
    clock = new FakeClock(new Date("2025-01-01T12:00:00Z"));
    logger = new FakeLogger();
    executionDurationMs = 0;

    mockEndpoint = {
      id: "ep1",
      jobId: "job1",
      tenantId: "tenant1",
      name: "test",
      baselineIntervalMs: 15_000, // 15 seconds
      nextRunAt: new Date("2025-01-01T12:00:00Z"),
      lastRunAt: new Date("2025-01-01T11:59:45Z"),
      failureCount: 0,
    };

    // Mock repos - cast partial implementations for testing
    // eslint-disable-next-line ts/consistent-type-assertions
    jobs = {
      claimDueEndpoints: vi.fn().mockResolvedValue(["ep1"]),
      getEndpoint: vi.fn().mockResolvedValue(mockEndpoint),
      updateAfterRun: vi.fn().mockResolvedValue(undefined),
    } as unknown as JobsRepo;

    // eslint-disable-next-line ts/consistent-type-assertions
    runs = {
      create: vi.fn().mockResolvedValue("run1"),
      finish: vi.fn().mockResolvedValue(undefined),
    } as unknown as RunsRepo;

    // Dispatcher that simulates execution time
    // eslint-disable-next-line ts/consistent-type-assertions
    dispatcher = {
      execute: vi.fn().mockImplementation(async () => {
        clock.advance(executionDurationMs);
        return { status: "success" as const, durationMs: executionDurationMs };
      }),
    } as unknown as Dispatcher;

    // eslint-disable-next-line ts/consistent-type-assertions
    cron = {
      next: vi.fn().mockImplementation((_expr: string, from: Date) => {
        // Simple mock: add 1 hour
        return new Date(from.getTime() + 3600_000);
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

  describe("fast execution (execution < interval)", () => {
    it("should maintain intended interval when execution is fast", async () => {
      executionDurationMs = 1_000; // 1 second execution

      await scheduler.tick(10, 10_000);

      expect(jobs.updateAfterRun).toHaveBeenCalledWith(
        "ep1",
        expect.objectContaining({
          lastRunAt: new Date("2025-01-01T12:00:00Z"), // Start time
          nextRunAt: new Date("2025-01-01T12:00:15Z"), // Start + 15s
        }),
      );
    });

    it("should handle AI interval hints correctly", async () => {
      executionDurationMs = 500;
      mockEndpoint.aiHintIntervalMs = 30_000; // 30s AI hint (overrides 15s baseline)
      mockEndpoint.aiHintExpiresAt = new Date("2025-01-01T13:00:00Z");

      await scheduler.tick(10, 10_000);

      expect(jobs.updateAfterRun).toHaveBeenCalledWith(
        "ep1",
        expect.objectContaining({
          nextRunAt: new Date("2025-01-01T12:00:30Z"), // Start + 30s (AI interval overrides baseline)
        }),
      );
    });
  });

  describe("slow execution (execution > interval)", () => {
    it("should reschedule from completion time when execution exceeds interval", async () => {
      executionDurationMs = 20_000; // 20 seconds (longer than 15s interval)

      await scheduler.tick(10, 10_000);

      // nextRunAt should be completion time + original interval
      // Start: 12:00:00, Execution: 20s, Completion: 12:00:20
      // Original interval: 15s, so nextRunAt = 12:00:20 + 15s = 12:00:35
      expect(jobs.updateAfterRun).toHaveBeenCalledWith(
        "ep1",
        expect.objectContaining({
          lastRunAt: new Date("2025-01-01T12:00:00Z"), // Start time
          nextRunAt: new Date("2025-01-01T12:00:35Z"), // Completion + interval
        }),
      );
    });

    it("should handle execution taking 2x the interval", async () => {
      executionDurationMs = 30_000; // 30 seconds (2x the 15s interval)

      await scheduler.tick(10, 10_000);

      // Start: 12:00:00, Completion: 12:00:30
      // nextRunAt = 12:00:30 + 15s = 12:00:45
      expect(jobs.updateAfterRun).toHaveBeenCalledWith(
        "ep1",
        expect.objectContaining({
          nextRunAt: new Date("2025-01-01T12:00:45Z"),
        }),
      );
    });

    it("should respect AI hints when rescheduling slow executions", async () => {
      executionDurationMs = 35_000; // 35 seconds
      mockEndpoint.aiHintIntervalMs = 30_000; // AI hint overrides baseline
      mockEndpoint.aiHintExpiresAt = new Date("2025-01-01T13:00:00Z");

      await scheduler.tick(10, 10_000);

      // Start: 12:00:00, planNextRun calculates: 12:00:00 + 30s = 12:00:30
      // But execution completes at 12:00:35, so safety check reschedules:
      // 12:00:35 + 30s (intended AI interval) = 12:01:05
      expect(jobs.updateAfterRun).toHaveBeenCalledWith(
        "ep1",
        expect.objectContaining({
          nextRunAt: new Date("2025-01-01T12:01:05Z"),
        }),
      );
    });
  });

  describe("exponential backoff with timing", () => {
    it("should apply backoff and handle slow execution correctly", async () => {
      executionDurationMs = 25_000; // 25 seconds
      mockEndpoint.failureCount = 2; // 4x backoff (15s * 4 = 60s)

      await scheduler.tick(10, 10_000);

      // Start: 12:00:00, Completion: 12:00:25
      // With failureCount=2, backoff interval = 15s * 4 = 60s
      // planNextRun calculates: 12:00:00 + 60s = 12:01:00
      // But execution finishes at 12:00:25, so safety check passes (12:01:00 > 12:00:25)
      // No adjustment needed, nextRunAt = 12:01:00
      expect(jobs.updateAfterRun).toHaveBeenCalledWith(
        "ep1",
        expect.objectContaining({
          nextRunAt: new Date("2025-01-01T12:01:00Z"),
        }),
      );
    });

    it("should reset failure count on success", async () => {
      executionDurationMs = 1_000;
      mockEndpoint.failureCount = 3;

      await scheduler.tick(10, 10_000);

      expect(jobs.updateAfterRun).toHaveBeenCalledWith(
        "ep1",
        expect.objectContaining({
          failureCountPolicy: "reset",
        }),
      );
    });

    it("should increment failure count on failure", async () => {
      executionDurationMs = 1_000;
      dispatcher.execute = vi.fn().mockImplementation(async () => {
        clock.advance(executionDurationMs);
        return { status: "failed" as const, durationMs: executionDurationMs };
      });

      await scheduler.tick(10, 10_000);

      expect(jobs.updateAfterRun).toHaveBeenCalledWith(
        "ep1",
        expect.objectContaining({
          failureCountPolicy: "increment",
        }),
      );
    });
  });

  describe("real-world scenario: variable execution times", () => {
    it("should handle consecutive runs with varying execution times", async () => {
      const executionTimes = [1_000, 18_000, 5_000, 22_000];
      const results: Date[] = [];

      for (const duration of executionTimes) {
        executionDurationMs = duration;

        await scheduler.tick(10, 10_000);

        const call = vi.mocked(jobs.updateAfterRun).mock.calls.at(-1);
        if (call) {
          results.push(call[1].nextRunAt);
          // Simulate time passing and update endpoint state
          clock.set(call[1].nextRunAt);
          mockEndpoint.lastRunAt = call[1].lastRunAt;
          mockEndpoint.nextRunAt = call[1].nextRunAt;
        }
      }

      // Verify all nextRunAt times are at least 15s apart
      for (let i = 1; i < results.length; i++) {
        const interval = results[i].getTime() - results[i - 1].getTime();
        expect(interval).toBeGreaterThanOrEqual(15_000);
      }
    });
  });

  describe("edge cases", () => {
    it("should handle execution starting with stale lastRunAt", async () => {
      executionDurationMs = 1_000;
      // lastRunAt is from yesterday
      mockEndpoint.lastRunAt = new Date("2025-01-01T00:00:00Z");

      await scheduler.tick(10, 10_000);

      // Should schedule from current execution time, not stale lastRunAt
      expect(jobs.updateAfterRun).toHaveBeenCalledWith(
        "ep1",
        expect.objectContaining({
          lastRunAt: new Date("2025-01-01T12:00:00Z"),
          nextRunAt: new Date("2025-01-01T12:00:15Z"),
        }),
      );
    });

    it("should ensure minimum 1 second interval when rescheduling", async () => {
      executionDurationMs = 15_100; // Just barely over interval
      mockEndpoint.baselineIntervalMs = 100; // Very short interval

      await scheduler.tick(10, 10_000);

      const call = vi.mocked(jobs.updateAfterRun).mock.calls[0];
      const scheduledTime = call[1].nextRunAt.getTime();
      const completionTime = clock.now().getTime();

      // Should be at least 1 second in future (safety minimum)
      expect(scheduledTime - completionTime).toBeGreaterThanOrEqual(1000);
    });
  });
});
