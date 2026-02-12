import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatTooltipDate,
  getDateRangeEndLabel,
  getDateRangeLabels,
  getDateRangeStartLabel,
  shouldShowTimeInTooltip,
} from '../time-range-labels';

describe('time-range-labels', () => {
  // Mock the current date for consistent testing
  // Use local time (no Z suffix) for predictable timezone behavior
  beforeEach(() => {
    vi.useFakeTimers();
    // Set to noon local time on Jan 15, 2024
    vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getDateRangeLabels', () => {
    it('returns default labels when no dates provided', () => {
      expect(getDateRangeLabels()).toEqual({ start: '7d ago', end: 'now' });
    });

    it('returns default labels when only startDate provided', () => {
      const startDate = new Date(2024, 0, 8, 0, 0, 0);
      expect(getDateRangeLabels(startDate, undefined)).toEqual({ start: '7d ago', end: 'now' });
    });

    it('returns default labels when only endDate provided', () => {
      const endDate = new Date(2024, 0, 15, 0, 0, 0);
      expect(getDateRangeLabels(undefined, endDate)).toEqual({ start: '7d ago', end: 'now' });
    });

    it('returns relative labels for range ending today', () => {
      const startDate = new Date(2024, 0, 8, 0, 0, 0);
      const endDate = new Date(2024, 0, 15, 0, 0, 0);
      expect(getDateRangeLabels(startDate, endDate)).toEqual({ start: '7d ago', end: 'now' });
    });

    it('returns "today" and "now" for same-day range on today', () => {
      const startDate = new Date(2024, 0, 15, 0, 0, 0);
      const endDate = new Date(2024, 0, 15, 23, 59, 59);
      expect(getDateRangeLabels(startDate, endDate)).toEqual({ start: 'today', end: 'now' });
    });

    it('returns formatted dates for historical range not ending today', () => {
      const startDate = new Date(2024, 0, 1, 0, 0, 0);
      const endDate = new Date(2024, 0, 7, 0, 0, 0);
      expect(getDateRangeLabels(startDate, endDate)).toEqual({ start: 'Jan 1', end: 'Jan 7' });
    });

    it('handles 1 day range ending today', () => {
      const startDate = new Date(2024, 0, 14, 0, 0, 0);
      const endDate = new Date(2024, 0, 15, 0, 0, 0);
      expect(getDateRangeLabels(startDate, endDate)).toEqual({ start: '1d ago', end: 'now' });
    });

    it('handles 30 day range ending today', () => {
      const startDate = new Date(2023, 11, 16, 0, 0, 0);
      const endDate = new Date(2024, 0, 15, 0, 0, 0);
      expect(getDateRangeLabels(startDate, endDate)).toEqual({ start: '30d ago', end: 'now' });
    });
  });

  describe('getDateRangeStartLabel', () => {
    it('returns start label from getDateRangeLabels', () => {
      const startDate = new Date(2024, 0, 8, 0, 0, 0);
      const endDate = new Date(2024, 0, 15, 0, 0, 0);
      expect(getDateRangeStartLabel(startDate, endDate)).toBe('7d ago');
    });

    it('returns "7d ago" for undefined dates', () => {
      expect(getDateRangeStartLabel(undefined, undefined)).toBe('7d ago');
    });
  });

  describe('getDateRangeEndLabel', () => {
    it('returns end label from getDateRangeLabels', () => {
      const startDate = new Date(2024, 0, 8, 0, 0, 0);
      const endDate = new Date(2024, 0, 15, 0, 0, 0);
      expect(getDateRangeEndLabel(startDate, endDate)).toBe('now');
    });

    it('returns "now" for undefined dates', () => {
      expect(getDateRangeEndLabel(undefined, undefined)).toBe('now');
    });

    it('returns formatted date for historical range', () => {
      const startDate = new Date(2024, 0, 1, 0, 0, 0);
      const endDate = new Date(2024, 0, 7, 0, 0, 0);
      expect(getDateRangeEndLabel(startDate, endDate)).toBe('Jan 7');
    });
  });

  describe('shouldShowTimeInTooltip', () => {
    it('returns false when no dates provided', () => {
      expect(shouldShowTimeInTooltip(undefined, undefined)).toBe(false);
    });

    it('returns false when only startDate provided', () => {
      const startDate = new Date(2024, 0, 14, 0, 0, 0);
      expect(shouldShowTimeInTooltip(startDate, undefined)).toBe(false);
    });

    it('returns true for 24 hour range', () => {
      const startDate = new Date(2024, 0, 14, 0, 0, 0);
      const endDate = new Date(2024, 0, 15, 0, 0, 0);
      expect(shouldShowTimeInTooltip(startDate, endDate)).toBe(true);
    });

    it('returns true for 48 hour range', () => {
      const startDate = new Date(2024, 0, 13, 0, 0, 0);
      const endDate = new Date(2024, 0, 15, 0, 0, 0);
      expect(shouldShowTimeInTooltip(startDate, endDate)).toBe(true);
    });

    it('returns true for 7 day range (within 14-day threshold)', () => {
      // 7 days is within the 14-day threshold for hourly granularity
      const startDate = new Date(2024, 0, 8, 0, 0, 0);
      const endDate = new Date(2024, 0, 15, 0, 0, 0);
      expect(shouldShowTimeInTooltip(startDate, endDate)).toBe(true);
    });

    it('returns true for 14 day range (at threshold)', () => {
      const startDate = new Date(2024, 0, 1, 0, 0, 0);
      const endDate = new Date(2024, 0, 15, 0, 0, 0);
      expect(shouldShowTimeInTooltip(startDate, endDate)).toBe(true);
    });

    it('returns false for 15 day range (beyond threshold)', () => {
      const startDate = new Date(2023, 11, 31, 0, 0, 0);
      const endDate = new Date(2024, 0, 15, 0, 0, 0);
      expect(shouldShowTimeInTooltip(startDate, endDate)).toBe(false);
    });
  });

  describe('formatTooltipDate', () => {
    it('shows time for short range (24 hours)', () => {
      const date = new Date(2024, 0, 15, 14, 30, 0);
      const startDate = new Date(2024, 0, 14, 0, 0, 0);
      const endDate = new Date(2024, 0, 15, 0, 0, 0);
      expect(formatTooltipDate(date, startDate, endDate)).toBe('Jan 15, 2024, 2:30 PM');
    });

    it('shows time for 7-day range (within 14-day threshold)', () => {
      const date = new Date(2024, 0, 15, 14, 30, 0);
      const startDate = new Date(2024, 0, 8, 0, 0, 0);
      const endDate = new Date(2024, 0, 15, 0, 0, 0);
      // 7 days is within the 14-day threshold, so time is shown
      expect(formatTooltipDate(date, startDate, endDate)).toBe('Jan 15, 2024, 2:30 PM');
    });

    it('hides time for longer range (30 days)', () => {
      const date = new Date(2024, 0, 15, 14, 30, 0);
      const startDate = new Date(2023, 11, 16, 0, 0, 0);
      const endDate = new Date(2024, 0, 15, 0, 0, 0);
      expect(formatTooltipDate(date, startDate, endDate)).toBe('Jan 15, 2024');
    });

    it('hides time when no range provided', () => {
      const date = new Date(2024, 0, 15, 14, 30, 0);
      expect(formatTooltipDate(date)).toBe('Jan 15, 2024');
    });

    it('shows time for same-day range', () => {
      const date = new Date(2024, 0, 15, 9, 0, 0);
      const startDate = new Date(2024, 0, 15, 0, 0, 0);
      const endDate = new Date(2024, 0, 15, 23, 59, 59);
      expect(formatTooltipDate(date, startDate, endDate)).toBe('Jan 15, 2024, 9:00 AM');
    });
  });
});
