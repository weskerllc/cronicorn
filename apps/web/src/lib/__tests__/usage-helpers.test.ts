import { describe, expect, it } from "vitest";
import {
  
  formatUsagePercentage,
  getMostCriticalWarning,
  getUsageWarningLevel
} from "../usage-helpers";
import type {UsageMetric} from "../usage-helpers";

describe("getUsageWarningLevel", () => {
  it("returns 'none' for usage below 80%", () => {
    expect(getUsageWarningLevel(50, 100)).toBe("none");
    expect(getUsageWarningLevel(79, 100)).toBe("none");
  });

  it("returns 'warning' for usage between 80% and 94%", () => {
    expect(getUsageWarningLevel(80, 100)).toBe("warning");
    expect(getUsageWarningLevel(90, 100)).toBe("warning");
    expect(getUsageWarningLevel(94, 100)).toBe("warning");
  });

  it("returns 'critical' for usage at or above 95%", () => {
    expect(getUsageWarningLevel(95, 100)).toBe("critical");
    expect(getUsageWarningLevel(100, 100)).toBe("critical");
    expect(getUsageWarningLevel(110, 100)).toBe("critical");
  });

  it("returns 'none' for unlimited (limit = 0)", () => {
    expect(getUsageWarningLevel(1000, 0)).toBe("none");
  });
});

describe("getMostCriticalWarning", () => {
  it("returns null when all metrics are below 80%", () => {
    const metrics: Array<UsageMetric> = [
      { used: 50, limit: 100, label: "Metric A" },
      { used: 70, limit: 100, label: "Metric B" },
    ];

    expect(getMostCriticalWarning(metrics)).toBeNull();
  });

  it("returns the warning-level metric when only one is at warning", () => {
    const metrics: Array<UsageMetric> = [
      { used: 50, limit: 100, label: "Metric A" },
      { used: 85, limit: 100, label: "Metric B" },
    ];

    const warning = getMostCriticalWarning(metrics);
    expect(warning).not.toBeNull();
    expect(warning?.level).toBe("warning");
    expect(warning?.metric.label).toBe("Metric B");
  });

  it("returns the critical-level metric when both warning and critical exist", () => {
    const metrics: Array<UsageMetric> = [
      { used: 85, limit: 100, label: "Metric A" }, // warning
      { used: 98, limit: 100, label: "Metric B" }, // critical
    ];

    const warning = getMostCriticalWarning(metrics);
    expect(warning).not.toBeNull();
    expect(warning?.level).toBe("critical");
    expect(warning?.metric.label).toBe("Metric B");
  });

  it("returns first critical metric when multiple are critical", () => {
    const metrics: Array<UsageMetric> = [
      { used: 98, limit: 100, label: "Metric A" }, // critical
      { used: 96, limit: 100, label: "Metric B" }, // critical
    ];

    const warning = getMostCriticalWarning(metrics);
    expect(warning).not.toBeNull();
    expect(warning?.level).toBe("critical");
    expect(warning?.metric.label).toBe("Metric A");
  });

  it("handles unlimited metrics (limit = 0)", () => {
    const metrics: Array<UsageMetric> = [
      { used: 1000, limit: 0, label: "Unlimited" },
      { used: 85, limit: 100, label: "Limited" },
    ];

    const warning = getMostCriticalWarning(metrics);
    expect(warning).not.toBeNull();
    expect(warning?.level).toBe("warning");
    expect(warning?.metric.label).toBe("Limited");
  });
});

describe("formatUsagePercentage", () => {
  it("formats percentage correctly", () => {
    expect(formatUsagePercentage(50, 100)).toBe("50%");
    expect(formatUsagePercentage(85, 100)).toBe("85%");
    expect(formatUsagePercentage(100, 100)).toBe("100%");
  });

  it("rounds to nearest integer", () => {
    expect(formatUsagePercentage(33, 100)).toBe("33%");
    expect(formatUsagePercentage(67, 100)).toBe("67%");
  });

  it("handles unlimited (limit = 0)", () => {
    expect(formatUsagePercentage(1000, 0)).toBe("0%");
  });

  it("handles over-limit usage", () => {
    expect(formatUsagePercentage(110, 100)).toBe("110%");
  });
});
