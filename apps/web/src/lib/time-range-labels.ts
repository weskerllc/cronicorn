/**
 * Utility functions for generating user-friendly time range labels for charts
 */

import { format, differenceInDays, isToday } from "date-fns";

/**
 * Generates user-friendly labels for a date range.
 * For ranges ending today, shows relative format like "7d ago" to "now".
 * For custom ranges, shows formatted dates.
 *
 * @param startDate - The start of the range
 * @param endDate - The end of the range
 * @returns An object with start and end labels
 */
export function getDateRangeLabels(
  startDate?: Date,
  endDate?: Date,
): { start: string; end: string } {
  if (!startDate || !endDate) {
    return { start: "7d ago", end: "now" };
  }

  const daysDiff = differenceInDays(endDate, startDate);
  const endsToday = isToday(endDate);

  // For ranges ending today, use relative labels
  if (endsToday) {
    if (daysDiff === 0) {
      return { start: "today", end: "now" };
    }
    return { start: `${daysDiff}d ago`, end: "now" };
  }

  // For custom historical ranges, use formatted dates
  return {
    start: format(startDate, "MMM d"),
    end: format(endDate, "MMM d"),
  };
}

/**
 * Generates a user-friendly label for the start of a date range.
 * Backwards-compatible wrapper for chart components.
 *
 * @param startDate - The start of the range
 * @param endDate - The end of the range
 * @returns A human-readable label like "7d ago", "Jan 15", etc.
 */
export function getDateRangeStartLabel(startDate?: Date, endDate?: Date): string {
  return getDateRangeLabels(startDate, endDate).start;
}

/**
 * Generates a user-friendly label for the end of a date range.
 * Backwards-compatible wrapper for chart components.
 *
 * @param startDate - The start of the range
 * @param endDate - The end of the range
 * @returns A human-readable label like "now", "Jan 22", etc.
 */
export function getDateRangeEndLabel(startDate?: Date, endDate?: Date): string {
  return getDateRangeLabels(startDate, endDate).end;
}
