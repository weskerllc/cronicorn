/**
 * Utility functions for generating user-friendly time range labels for charts
 */

export type TimeRangeValue = '24h' | '7d' | '30d' | 'all';

/**
 * Formats a date label for tooltips based on the selected time range.
 * Shows hour-level precision for 24h, otherwise shows date only.
 */
export function formatTimeRangeTooltipLabel(date: Date, timeRange?: TimeRangeValue): string {
  if (timeRange === '24h') {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Generates a user-friendly label for the start of a time range
 * @param timeRange - The selected time range filter
 * @returns A human-readable label like "1d ago", "7d ago", etc.
 */
export function getTimeRangeStartLabel(timeRange?: TimeRangeValue): string {
  switch (timeRange) {
    case '24h':
      return '1d ago';
    case '7d':
      return '7d ago';
    case '30d':
      return '30d ago';
    case 'all':
      return '30d ago'; // All time is capped at 30 days
    default:
      return '7d ago';
  }
}

/**
 * Generates a user-friendly label for the end of a time range (typically "now")
 * @returns "now" to indicate the current time
 */
export function getTimeRangeEndLabel(): string {
  return 'now';
}
