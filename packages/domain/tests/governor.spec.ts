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
    expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:05:00.000Z");
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

  it("min clamp applies relative to lastRunAt", () => {
    const ep = makeEndpoint({
      lastRunAt: at("2025-01-01T00:00:00Z"),
      baselineIntervalMs: 10_000, // 10 seconds
      minIntervalMs: 60_000, // min 1 minute
    });
    const result = planNextRun(at("2025-01-01T00:00:05Z"), ep, stubCron);

    expect(result.source).toBe("clamped-min");
    expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:01:00.000Z");
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

  it("floors past candidate to now", () => {
    const ep = makeEndpoint({
      lastRunAt: at("2025-01-01T00:00:00Z"),
      baselineIntervalMs: 60_000, // 1 minute
    });
    // Current time is 10 minutes after last run; candidate would be 00:01:00
    const result = planNextRun(at("2025-01-01T00:10:00Z"), ep, stubCron);

    // Should floor to current time, not past
    expect(result.nextRunAt.toISOString()).toBe("2025-01-01T00:10:00.000Z");
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
});
