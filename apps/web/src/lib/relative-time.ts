/**
 * Utility function for formatting dates as human-readable relative times
 * (e.g., "just now", "2 minutes ago", "3 hours ago", "yesterday", "2 weeks ago")
 */

/**
 * Formats a date as a human-readable relative time string
 * 
 * @param date - The date to format (Date object, ISO string, or timestamp)
 * @param now - Optional current time (defaults to Date.now(), useful for testing)
 * @returns A human-readable relative time string
 * 
 * @example
 * formatRelativeTime(new Date(Date.now() - 5000)) // "just now"
 * formatRelativeTime(new Date(Date.now() - 120000)) // "2 minutes ago"
 * formatRelativeTime(new Date(Date.now() - 7200000)) // "2 hours ago"
 * formatRelativeTime(new Date(Date.now() - 86400000)) // "yesterday"
 */
export function formatRelativeTime(date: Date | string | number, now: number = Date.now()): string {
  const targetDate = typeof date === 'object' ? date.getTime() : new Date(date).getTime();
  const diffMs = now - targetDate;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  // Future dates
  if (diffMs < 0) {
    const absDiffSec = Math.abs(diffSec);
    const absDiffMin = Math.abs(diffMin);
    const absDiffHour = Math.abs(diffHour);
    const absDiffDay = Math.abs(diffDay);

    if (absDiffSec < 60) {
      return 'in a few seconds';
    } else if (absDiffMin === 1) {
      return 'in 1 minute';
    } else if (absDiffMin < 60) {
      return `in ${absDiffMin} minutes`;
    } else if (absDiffHour === 1) {
      return 'in 1 hour';
    } else if (absDiffHour < 24) {
      return `in ${absDiffHour} hours`;
    } else if (absDiffDay === 1) {
      return 'tomorrow';
    } else if (absDiffDay < 7) {
      return `in ${absDiffDay} days`;
    } else {
      // For future dates > 1 week, show absolute date
      return new Date(targetDate).toLocaleDateString();
    }
  }

  // Past dates
  if (diffSec < 10) {
    return 'just now';
  } else if (diffSec < 60) {
    return 'less than a minute ago';
  } else if (diffMin === 1) {
    return '1 minute ago';
  } else if (diffMin < 60) {
    return `${diffMin} minutes ago`;
  } else if (diffHour === 1) {
    return '1 hour ago';
  } else if (diffHour < 24) {
    return `${diffHour} hours ago`;
  } else if (diffDay === 1) {
    return 'yesterday';
  } else if (diffDay < 7) {
    return `${diffDay} days ago`;
  } else if (diffWeek === 1) {
    return '1 week ago';
  } else if (diffWeek < 4) {
    return `${diffWeek} weeks ago`;
  } else if (diffMonth === 1) {
    return '1 month ago';
  } else if (diffMonth < 12) {
    return `${diffMonth} months ago`;
  } else if (diffYear === 1) {
    return '1 year ago';
  } else {
    return `${diffYear} years ago`;
  }
}

/**
 * Formats a date as a full datetime string suitable for tooltips
 * 
 * @param date - The date to format (Date object, ISO string, or timestamp)
 * @returns A formatted datetime string (e.g., "January 15, 2024 at 3:45 PM")
 */
export function formatFullDateTime(date: Date | string | number): string {
  const dateObj = typeof date === 'object' ? date : new Date(date);
  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
