/**
 * Helper functions for usage/quota calculations
 */

export type UsageMetric = {
  used: number;
  limit: number;
  label: string;
};

export type UsageWarningLevel = "none" | "warning" | "critical";

export type UsageWarning = {
  level: UsageWarningLevel;
  metric: UsageMetric;
};

/**
 * Determine the warning level for a usage metric.
 * - "critical": >= 100% or >= 95%
 * - "warning": >= 80%
 * - "none": < 80%
 */
export function getUsageWarningLevel(
  used: number,
  limit: number,
): UsageWarningLevel {
  if (limit === 0) return "none"; // Unlimited

  const percentage = (used / limit) * 100;

  if (percentage >= 95) return "critical";
  if (percentage >= 80) return "warning";
  return "none";
}

/**
 * Get the most critical warning from all usage metrics.
 * Returns null if no warnings present.
 */
export function getMostCriticalWarning(
  metrics: UsageMetric[],
): UsageWarning | null {
  let mostCritical: UsageWarning | null = null;

  for (const metric of metrics) {
    const level = getUsageWarningLevel(metric.used, metric.limit);

    if (level === "none") continue;

    // Upgrade if more critical or first warning found
    if (
      !mostCritical ||
      (level === "critical" && mostCritical.level === "warning")
    ) {
      mostCritical = { level, metric };
    }
  }

  return mostCritical;
}

/**
 * Format a usage percentage for display.
 */
export function formatUsagePercentage(used: number, limit: number): string {
  if (limit === 0) return "0%";
  return `${Math.round((used / limit) * 100)}%`;
}
