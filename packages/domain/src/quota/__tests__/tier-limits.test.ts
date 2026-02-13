import { describe, expect, it } from "vitest";

import {
  getExecutionLimits,
  getRunsLimit,
  getTierLimit,
  TIER_EXECUTION_LIMITS,
  TIER_LIMITS,
} from "../tier-limits.js";

describe("getTierLimit", () => {
  it("returns 100k tokens for free tier", () => {
    expect(getTierLimit("free")).toBe(100_000);
  });

  it("returns 15M tokens for pro tier", () => {
    expect(getTierLimit("pro")).toBe(15_000_000);
  });

  it("returns 10M tokens for enterprise tier", () => {
    expect(getTierLimit("enterprise")).toBe(10_000_000);
  });
});

describe("getExecutionLimits", () => {
  it("returns correct free tier limits", () => {
    const limits = getExecutionLimits("free");

    expect(limits.maxEndpoints).toBe(5);
    expect(limits.minIntervalMs).toBe(60_000);
    expect(limits.maxRunsPerMonth).toBe(10_000);
  });

  it("returns correct pro tier limits", () => {
    const limits = getExecutionLimits("pro");

    expect(limits.maxEndpoints).toBe(100);
    expect(limits.minIntervalMs).toBe(10_000);
    expect(limits.maxRunsPerMonth).toBe(100_000);
  });

  it("returns correct enterprise tier limits", () => {
    const limits = getExecutionLimits("enterprise");

    expect(limits.maxEndpoints).toBe(1_000);
    expect(limits.minIntervalMs).toBe(1_000);
    expect(limits.maxRunsPerMonth).toBe(1_000_000);
  });
});

describe("getRunsLimit", () => {
  it("returns 10k for free tier", () => {
    expect(getRunsLimit("free")).toBe(10_000);
  });

  it("returns 100k for pro tier", () => {
    expect(getRunsLimit("pro")).toBe(100_000);
  });

  it("returns 1M for enterprise tier", () => {
    expect(getRunsLimit("enterprise")).toBe(1_000_000);
  });

  it("matches TIER_EXECUTION_LIMITS maxRunsPerMonth", () => {
    expect(getRunsLimit("free")).toBe(TIER_EXECUTION_LIMITS.free.maxRunsPerMonth);
    expect(getRunsLimit("pro")).toBe(TIER_EXECUTION_LIMITS.pro.maxRunsPerMonth);
    expect(getRunsLimit("enterprise")).toBe(TIER_EXECUTION_LIMITS.enterprise.maxRunsPerMonth);
  });
});

describe("tier limits constants", () => {
  it("free tier has lowest token limit", () => {
    expect(TIER_LIMITS.free).toBeLessThan(TIER_LIMITS.pro);
  });

  it("all tiers have positive token limits", () => {
    expect(TIER_LIMITS.free).toBeGreaterThan(0);
    expect(TIER_LIMITS.pro).toBeGreaterThan(0);
    expect(TIER_LIMITS.enterprise).toBeGreaterThan(0);
  });
});

describe("tier execution limits constants", () => {
  it("higher tiers allow more endpoints", () => {
    expect(TIER_EXECUTION_LIMITS.free.maxEndpoints).toBeLessThan(TIER_EXECUTION_LIMITS.pro.maxEndpoints);
    expect(TIER_EXECUTION_LIMITS.pro.maxEndpoints).toBeLessThan(TIER_EXECUTION_LIMITS.enterprise.maxEndpoints);
  });

  it("higher tiers allow shorter intervals", () => {
    expect(TIER_EXECUTION_LIMITS.free.minIntervalMs).toBeGreaterThan(TIER_EXECUTION_LIMITS.pro.minIntervalMs);
    expect(TIER_EXECUTION_LIMITS.pro.minIntervalMs).toBeGreaterThan(TIER_EXECUTION_LIMITS.enterprise.minIntervalMs);
  });

  it("higher tiers allow more runs per month", () => {
    expect(TIER_EXECUTION_LIMITS.free.maxRunsPerMonth).toBeLessThan(TIER_EXECUTION_LIMITS.pro.maxRunsPerMonth);
    expect(TIER_EXECUTION_LIMITS.pro.maxRunsPerMonth).toBeLessThan(TIER_EXECUTION_LIMITS.enterprise.maxRunsPerMonth);
  });
});
