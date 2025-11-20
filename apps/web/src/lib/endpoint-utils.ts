/**
 * Endpoint utility functions
 * Shared utilities for working with endpoint data across the application
 */

/**
 * Determines if an endpoint is currently paused based on its pausedUntil timestamp
 * 
 * @param pausedUntil - ISO timestamp until which the endpoint is paused
 * @returns true if the endpoint is paused (pausedUntil is set and in the future)
 */
export function isEndpointPaused(pausedUntil?: string | null): boolean {
  return !!(pausedUntil && new Date(pausedUntil) > new Date());
}

/**
 * Gets the status of an endpoint based on its pausedUntil and archivedAt timestamps
 * 
 * @param pausedUntil - ISO timestamp until which the endpoint is paused
 * @param archivedAt - ISO timestamp when the endpoint was archived
 * @returns "archived" if archived, "paused" if paused, otherwise "active"
 */
export function getEndpointStatus(
  pausedUntil?: string | null,
  archivedAt?: string | null
): "active" | "paused" | "archived" {
  if (archivedAt) return "archived";
  return isEndpointPaused(pausedUntil) ? "paused" : "active";
}

/**
 * Format milliseconds as a concise human string (ms or s)
 */
export function formatDuration(ms: number | null): string | null {
  if (ms == null) return null;
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  return `${s.toFixed(s >= 10 ? 0 : 1)}s`;
}
