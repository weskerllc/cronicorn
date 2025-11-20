import { describe, it, expect } from 'vitest';
import { formatRelativeTime, formatFullDateTime } from '../relative-time';

describe('formatRelativeTime', () => {
  const baseTime = new Date('2024-01-15T12:00:00Z').getTime();

  describe('past times', () => {
    it('returns "just now" for times less than 10 seconds ago', () => {
      expect(formatRelativeTime(baseTime - 5000, baseTime)).toBe('just now');
      expect(formatRelativeTime(baseTime - 9000, baseTime)).toBe('just now');
    });

    it('returns "less than a minute ago" for 10-59 seconds', () => {
      expect(formatRelativeTime(baseTime - 10000, baseTime)).toBe('less than a minute ago');
      expect(formatRelativeTime(baseTime - 30000, baseTime)).toBe('less than a minute ago');
      expect(formatRelativeTime(baseTime - 59000, baseTime)).toBe('less than a minute ago');
    });

    it('returns "1 minute ago" for exactly 1 minute', () => {
      expect(formatRelativeTime(baseTime - 60000, baseTime)).toBe('1 minute ago');
      expect(formatRelativeTime(baseTime - 119000, baseTime)).toBe('1 minute ago');
    });

    it('returns "X minutes ago" for 2-59 minutes', () => {
      expect(formatRelativeTime(baseTime - 120000, baseTime)).toBe('2 minutes ago');
      expect(formatRelativeTime(baseTime - 300000, baseTime)).toBe('5 minutes ago');
      expect(formatRelativeTime(baseTime - 1800000, baseTime)).toBe('30 minutes ago');
      expect(formatRelativeTime(baseTime - 3540000, baseTime)).toBe('59 minutes ago');
    });

    it('returns "1 hour ago" for exactly 1 hour', () => {
      expect(formatRelativeTime(baseTime - 3600000, baseTime)).toBe('1 hour ago');
      expect(formatRelativeTime(baseTime - 7199000, baseTime)).toBe('1 hour ago');
    });

    it('returns "X hours ago" for 2-23 hours', () => {
      expect(formatRelativeTime(baseTime - 7200000, baseTime)).toBe('2 hours ago');
      expect(formatRelativeTime(baseTime - 10800000, baseTime)).toBe('3 hours ago');
      expect(formatRelativeTime(baseTime - 82800000, baseTime)).toBe('23 hours ago');
    });

    it('returns "yesterday" for exactly 1 day', () => {
      expect(formatRelativeTime(baseTime - 86400000, baseTime)).toBe('yesterday');
      expect(formatRelativeTime(baseTime - 172799000, baseTime)).toBe('yesterday');
    });

    it('returns "X days ago" for 2-6 days', () => {
      expect(formatRelativeTime(baseTime - 172800000, baseTime)).toBe('2 days ago');
      expect(formatRelativeTime(baseTime - 259200000, baseTime)).toBe('3 days ago');
      expect(formatRelativeTime(baseTime - 518400000, baseTime)).toBe('6 days ago');
    });

    it('returns "1 week ago" for exactly 1 week', () => {
      expect(formatRelativeTime(baseTime - 604800000, baseTime)).toBe('1 week ago');
    });

    it('returns "X weeks ago" for 2-3 weeks', () => {
      expect(formatRelativeTime(baseTime - 1209600000, baseTime)).toBe('2 weeks ago');
      expect(formatRelativeTime(baseTime - 1814400000, baseTime)).toBe('3 weeks ago');
    });

    it('returns "1 month ago" for approximately 1 month', () => {
      expect(formatRelativeTime(baseTime - 2592000000, baseTime)).toBe('1 month ago');
    });

    it('returns "X months ago" for 2-11 months', () => {
      expect(formatRelativeTime(baseTime - 5184000000, baseTime)).toBe('2 months ago');
      expect(formatRelativeTime(baseTime - 15552000000, baseTime)).toBe('6 months ago');
      expect(formatRelativeTime(baseTime - 28512000000, baseTime)).toBe('11 months ago');
    });

    it('returns "1 year ago" for approximately 1 year', () => {
      expect(formatRelativeTime(baseTime - 31536000000, baseTime)).toBe('1 year ago');
    });

    it('returns "X years ago" for multiple years', () => {
      expect(formatRelativeTime(baseTime - 63072000000, baseTime)).toBe('2 years ago');
      expect(formatRelativeTime(baseTime - 157680000000, baseTime)).toBe('5 years ago');
    });
  });

  describe('future times', () => {
    it('returns "in a few seconds" for times less than 60 seconds in future', () => {
      expect(formatRelativeTime(baseTime + 5000, baseTime)).toBe('in a few seconds');
      expect(formatRelativeTime(baseTime + 45000, baseTime)).toBe('in a few seconds');
    });

    it('returns "in 1 minute" for 1-2 minutes range', () => {
      expect(formatRelativeTime(baseTime + 60000, baseTime)).toBe('in 1 minute');
    });

    it('returns "in X minutes" for 2-59 minutes', () => {
      expect(formatRelativeTime(baseTime + 120000, baseTime)).toBe('in 2 minutes');
      expect(formatRelativeTime(baseTime + 300000, baseTime)).toBe('in 5 minutes');
      expect(formatRelativeTime(baseTime + 3540000, baseTime)).toBe('in 59 minutes');
    });

    it('returns "in 1 hour" for exactly 1 hour', () => {
      expect(formatRelativeTime(baseTime + 3600000, baseTime)).toBe('in 1 hour');
    });

    it('returns "in X hours" for 2-23 hours', () => {
      expect(formatRelativeTime(baseTime + 7200000, baseTime)).toBe('in 2 hours');
      expect(formatRelativeTime(baseTime + 82800000, baseTime)).toBe('in 23 hours');
    });

    it('returns "tomorrow" for exactly 1 day', () => {
      expect(formatRelativeTime(baseTime + 86400000, baseTime)).toBe('tomorrow');
    });

    it('returns "in X days" for 2-6 days', () => {
      expect(formatRelativeTime(baseTime + 172800000, baseTime)).toBe('in 2 days');
      expect(formatRelativeTime(baseTime + 518400000, baseTime)).toBe('in 6 days');
    });

    it('returns absolute date for future dates > 1 week', () => {
      const futureDate = baseTime + 604800000 + 1; // Just over 1 week
      const result = formatRelativeTime(futureDate, baseTime);
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });

  describe('input formats', () => {
    it('accepts Date objects', () => {
      const date = new Date(baseTime - 300000);
      expect(formatRelativeTime(date, baseTime)).toBe('5 minutes ago');
    });

    it('accepts ISO string dates', () => {
      const isoString = new Date(baseTime - 3600000).toISOString();
      expect(formatRelativeTime(isoString, baseTime)).toBe('1 hour ago');
    });

    it('accepts timestamps', () => {
      expect(formatRelativeTime(baseTime - 7200000, baseTime)).toBe('2 hours ago');
    });

    it('uses current time when now is not provided', () => {
      const recentDate = new Date(Date.now() - 5000);
      expect(formatRelativeTime(recentDate)).toBe('just now');
    });
  });
});

describe('formatFullDateTime', () => {
  it('formats date as readable full datetime', () => {
    const date = new Date('2024-01-15T15:45:30Z');
    const result = formatFullDateTime(date);
    // Result will vary by timezone, but should contain key components
    expect(result).toMatch(/January 15, 2024/);
    expect(result).toMatch(/\d{1,2}:\d{2}\s[AP]M/);
  });

  it('accepts ISO string dates', () => {
    const isoString = '2024-06-20T10:30:00Z';
    const result = formatFullDateTime(isoString);
    expect(result).toMatch(/June 20, 2024/);
  });

  it('accepts timestamps', () => {
    const timestamp = new Date('2024-12-25T08:00:00Z').getTime();
    const result = formatFullDateTime(timestamp);
    expect(result).toMatch(/December 25, 2024/);
  });
});
