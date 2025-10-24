import { describe, expect, it } from "vitest";

import { at, makeEndpoint, planNextRun } from "../src/index.js";

// Stub cron implementation for tests
const stubCron = {
  next: (_expr: string, from: Date) => new Date(from.getTime() + 60_000), // +1min
};

describe("planNextRun", () => {
  it("pause wins over all other sources", () => {
    const ep = makeEndpoint({
      pausedUntil: at("2025-01-01T00:10:00Z"),
      baselineIntervalMs: 5000,
    });
    const result = planNextRun(at("2025-01-01T00:00:00Z"), ep, stubCron);

    expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:10:00.000Z");
    expect(result.source).toBe("paused");
  });

  it("baseline interval when no hints or cron", () => {
    const ep = makeEndpoint({
      baselineIntervalMs: 300_000, // 5 minutes
      lastRunAt: at("2025-01-01T00:00:00Z"),
    });
    const result = planNextRun(at("2025-01-01T00:05:00Z"), ep, stubCron);

    expect(result.source).toBe("baseline-interval");
    // Now calculates from 'now' (00:05:00) + 5min = 00:10:00
    expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:10:00.000Z");
  });

  it("baseline cron when configured", () => {
    const ep = makeEndpoint({
      baselineCron: "* * * * *",
      lastRunAt: at("2025-01-01T00:00:00Z"),
    });
    const result = planNextRun(at("2025-01-01T00:00:00Z"), ep, stubCron);

    expect(result.source).toBe("baseline-cron");
  });

  it("ai hint interval (fresh) beats baseline", () => {
    const ep = makeEndpoint({
      baselineIntervalMs: 300_000, // 5 min
      aiHintIntervalMs: 60_000, // 1 min
      aiHintExpiresAt: at("2025-01-01T00:10:00Z"),
      lastRunAt: at("2025-01-01T00:00:00Z"),
    });
    const result = planNextRun(at("2025-01-01T00:00:00Z"), ep, stubCron);

    expect(result.source).toBe("ai-interval");
    expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:01:00.000Z");
  });

  it("ai hint oneshot (fresh) beats baseline", () => {
    const ep = makeEndpoint({
      baselineIntervalMs: 300_000,
      aiHintNextRunAt: at("2025-01-01T00:02:00Z"),
      aiHintExpiresAt: at("2025-01-01T00:10:00Z"),
      lastRunAt: at("2025-01-01T00:00:00Z"),
    });
    const result = planNextRun(at("2025-01-01T00:00:00Z"), ep, stubCron);

    expect(result.source).toBe("ai-oneshot");
    expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:02:00.000Z");
  });

  it("expired hint is ignored", () => {
    const ep = makeEndpoint({
      baselineIntervalMs: 300_000,
      aiHintIntervalMs: 60_000,
      aiHintExpiresAt: at("2025-01-01T00:01:00Z"), // already expired
      lastRunAt: at("2025-01-01T00:00:00Z"),
    });
    const result = planNextRun(at("2025-01-01T00:05:00Z"), ep, stubCron);

    expect(result.source).toBe("baseline-interval");
  });

  it("min clamp applies relative to now", () => {
    const ep = makeEndpoint({
      lastRunAt: at("2025-01-01T00:00:00Z"),
      baselineIntervalMs: 10_000, // 10 seconds
      minIntervalMs: 60_000, // min 1 minute
    });
    const result = planNextRun(at("2025-01-01T00:00:05Z"), ep, stubCron);

    expect(result.source).toBe("clamped-min");
    // Clamps from 'now' (00:00:05) + 60s = 00:01:05
    expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:01:05.000Z");
  });

  it("max clamp applies relative to lastRunAt", () => {
    const ep = makeEndpoint({
      lastRunAt: at("2025-01-01T00:00:00Z"),
      baselineIntervalMs: 600_000, // 10 minutes
      maxIntervalMs: 180_000, // max 3 minutes
    });
    const result = planNextRun(at("2025-01-01T00:00:00Z"), ep, stubCron);

    expect(result.source).toBe("clamped-max");
    expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:03:00.000Z");
  });

  it("schedules from now when lastRunAt is stale", () => {
    const ep = makeEndpoint({
      lastRunAt: at("2025-01-01T00:00:00Z"),
      baselineIntervalMs: 60_000, // 1 minute
    });
    // Current time is 10 minutes after last run
    const result = planNextRun(at("2025-01-01T00:10:00Z"), ep, stubCron);

    // Should schedule from 'now' + interval = 00:10:00 + 1min = 00:11:00
    expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:11:00.000Z");
  });

  it("chooses earliest among multiple fresh hints", () => {
    const ep = makeEndpoint({
      lastRunAt: at("2025-01-01T00:00:00Z"),
      baselineIntervalMs: 600_000, // 10 min
      aiHintIntervalMs: 120_000, // 2 min (relative to lastRunAt = 00:02:00)
      aiHintNextRunAt: at("2025-01-01T00:01:30Z"), // oneshot earlier
      aiHintExpiresAt: at("2025-01-01T01:00:00Z"),
    });
    const result = planNextRun(at("2025-01-01T00:00:00Z"), ep, stubCron);

    expect(result.source).toBe("ai-oneshot");
    expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:01:30.000Z");
  });

  describe("exponential backoff", () => {
    it("no backoff when failureCount is 0", () => {
      const ep = makeEndpoint({
        lastRunAt: at("2025-01-01T00:00:00Z"),
        baselineIntervalMs: 60_000, // 1 minute
        failureCount: 0,
      });
      const result = planNextRun(at("2025-01-01T00:00:00Z"), ep, stubCron);

      expect(result.source).toBe("baseline-interval");
      expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:01:00.000Z");
    });

    it("2x backoff after 1 failure", () => {
      const ep = makeEndpoint({
        lastRunAt: at("2025-01-01T00:00:00Z"),
        baselineIntervalMs: 60_000, // 1 minute base
        failureCount: 1,
      });
      const result = planNextRun(at("2025-01-01T00:00:00Z"), ep, stubCron);

      expect(result.source).toBe("baseline-interval");
      // 60s * 2^1 = 120s = 2 minutes
      expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:02:00.000Z");
    });

    it("4x backoff after 2 failures", () => {
      const ep = makeEndpoint({
        lastRunAt: at("2025-01-01T00:00:00Z"),
        baselineIntervalMs: 60_000,
        failureCount: 2,
      });
      const result = planNextRun(at("2025-01-01T00:00:00Z"), ep, stubCron);

      // 60s * 2^2 = 240s = 4 minutes
      expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:04:00.000Z");
    });

    it("32x backoff after 5 failures (capped)", () => {
      const ep = makeEndpoint({
        lastRunAt: at("2025-01-01T00:00:00Z"),
        baselineIntervalMs: 60_000,
        failureCount: 5,
      });
      const result = planNextRun(at("2025-01-01T00:00:00Z"), ep, stubCron);

      // 60s * 2^5 = 1920s = 32 minutes
      expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:32:00.000Z");
    });

    it("backoff caps at 32x even with more failures", () => {
      const ep = makeEndpoint({
        lastRunAt: at("2025-01-01T00:00:00Z"),
        baselineIntervalMs: 60_000,
        failureCount: 10, // Much higher than cap
      });
      const result = planNextRun(at("2025-01-01T00:00:00Z"), ep, stubCron);

      // Still capped at 60s * 2^5 = 1920s
      expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:32:00.000Z");
    });

    it("backoff does not apply to cron-based schedules", () => {
      const ep = makeEndpoint({
        baselineCron: "* * * * *",
        lastRunAt: at("2025-01-01T00:00:00Z"),
        failureCount: 5, // High failure count
      });
      const result = planNextRun(at("2025-01-01T00:00:00Z"), ep, stubCron);

      expect(result.source).toBe("baseline-cron");
      // Cron still returns normal next time (stub returns +1min)
      expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:01:00.000Z");
    });

    it("backoff respects max interval clamp", () => {
      const ep = makeEndpoint({
        lastRunAt: at("2025-01-01T00:00:00Z"),
        baselineIntervalMs: 60_000, // 1 minute
        failureCount: 5, // Would be 32 minutes with backoff
        maxIntervalMs: 300_000, // Max 5 minutes
      });
      const result = planNextRun(at("2025-01-01T00:00:00Z"), ep, stubCron);

      expect(result.source).toBe("clamped-max");
      // Clamped to 5 minutes instead of 32 minutes
      expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:05:00.000Z");
    });

    it("aI hints can override backoff", () => {
      const ep = makeEndpoint({
        lastRunAt: at("2025-01-01T00:00:00Z"),
        baselineIntervalMs: 60_000,
        failureCount: 5, // Would push baseline to 32 minutes
        aiHintIntervalMs: 120_000, // AI suggests 2 minutes
        aiHintExpiresAt: at("2025-01-01T01:00:00Z"),
      });
      const result = planNextRun(at("2025-01-01T00:00:00Z"), ep, stubCron);

      expect(result.source).toBe("ai-interval");
      // AI hint wins (2 minutes < 32 minutes)
      expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:02:00.000Z");
    });

    it("backoff prevents tight retry loop on failures", () => {
      // Simulate the user's scenario: failing endpoint that would retry every 5s
      const ep = makeEndpoint({
        lastRunAt: at("2025-01-01T00:00:00Z"),
        baselineIntervalMs: 60_000, // 1 minute baseline
        failureCount: 3, // After 3 failures
      });
      // Even if we're calling this 10 seconds after the last run
      const result = planNextRun(at("2025-01-01T00:00:10Z"), ep, stubCron);

      // 60s * 2^3 = 480s = 8 minutes from 'now' (00:00:10)
      // 00:00:10 + 8min = 00:08:10
      expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:08:10.000Z");
      // This is 8 minutes in the future from "now", preventing immediate retry
    });
  });
});
