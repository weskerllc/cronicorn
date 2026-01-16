/**
 * Utility functions for generating user-friendly time range labels for charts
 */

import { differenceInDays, format, isToday } from "date-fns";

/**
 * Determines whether to show time in tooltip based on the date range span.
 * Shows time for ranges up to 14 days (when backend uses hourly granularity).
 *
 * Backend bucketing strategy:
 * - Up to 14 days: hourly granularity (1, 2, 3, 4, 6, 8, or 12-hour buckets)
 * - Beyond 14 days: daily granularity (1, 2, 3, 7, or 14-day buckets)
 *
 * @param startDate - The start of the range
 * @param endDate - The end of the range
 * @returns true if time should be shown in tooltips
 */
export function shouldShowTimeInTooltip(startDate?: Date, endDate?: Date): boolean {
  if (!startDate || !endDate) {
    return false;
  }
  const daysDiff = differenceInDays(endDate, startDate);
  // Show time for ranges of 14 days or less (backend uses hourly granularity)
  return daysDiff <= 14;
}

/**
 * Formats a date for display in chart tooltips.
 * Shows time when the date range uses hourly buckets (<=14 days), otherwise just date.
 *
 * @param date - The date to format
 * @param startDate - Optional start of the displayed range (for determining granularity)
 * @param endDate - Optional end of the displayed range (for determining granularity)
 * @returns Formatted date string like "Jan 15, 2024" or "Jan 15, 2024, 3:00 PM"
 */
export function formatTooltipDate(
  date: Date,
  startDate?: Date,
  endDate?: Date,
): string {
  const showTime = shouldShowTimeInTooltip(startDate, endDate);

  if (showTime) {
    return format(date, "MMM d, yyyy, h:mm a");
  }

  return format(date, "MMM d, yyyy");
}

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
