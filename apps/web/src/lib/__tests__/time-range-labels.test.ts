import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { getDateRangeLabels, getDateRangeStartLabel, getDateRangeEndLabel } from '../time-range-labels';

describe('time-range-labels', () => {
  // Mock the current date for consistent testing
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getDateRangeLabels', () => {
    it('returns default labels when no dates provided', () => {
      expect(getDateRangeLabels()).toEqual({ start: '7d ago', end: 'now' });
    });

    it('returns default labels when only startDate provided', () => {
      const startDate = new Date('2024-01-08T00:00:00.000Z');
      expect(getDateRangeLabels(startDate, undefined)).toEqual({ start: '7d ago', end: 'now' });
    });

    it('returns default labels when only endDate provided', () => {
      const endDate = new Date('2024-01-15T00:00:00.000Z');
      expect(getDateRangeLabels(undefined, endDate)).toEqual({ start: '7d ago', end: 'now' });
    });

    it('returns relative labels for range ending today', () => {
      const startDate = new Date('2024-01-08T00:00:00.000Z');
      const endDate = new Date('2024-01-15T00:00:00.000Z');
      expect(getDateRangeLabels(startDate, endDate)).toEqual({ start: '7d ago', end: 'now' });
    });

    it('returns "today" and "now" for same-day range on today', () => {
      const startDate = new Date('2024-01-15T00:00:00.000Z');
      const endDate = new Date('2024-01-15T23:59:59.000Z');
      expect(getDateRangeLabels(startDate, endDate)).toEqual({ start: 'today', end: 'now' });
    });

    it('returns formatted dates for historical range not ending today', () => {
      const startDate = new Date('2024-01-01T00:00:00.000Z');
      const endDate = new Date('2024-01-07T00:00:00.000Z');
      expect(getDateRangeLabels(startDate, endDate)).toEqual({ start: 'Jan 1', end: 'Jan 7' });
    });

    it('handles 1 day range ending today', () => {
      const startDate = new Date('2024-01-14T00:00:00.000Z');
      const endDate = new Date('2024-01-15T00:00:00.000Z');
      expect(getDateRangeLabels(startDate, endDate)).toEqual({ start: '1d ago', end: 'now' });
    });

    it('handles 30 day range ending today', () => {
      const startDate = new Date('2023-12-16T00:00:00.000Z');
      const endDate = new Date('2024-01-15T00:00:00.000Z');
      expect(getDateRangeLabels(startDate, endDate)).toEqual({ start: '30d ago', end: 'now' });
    });
  });

  describe('getDateRangeStartLabel', () => {
    it('returns start label from getDateRangeLabels', () => {
      const startDate = new Date('2024-01-08T00:00:00.000Z');
      const endDate = new Date('2024-01-15T00:00:00.000Z');
      expect(getDateRangeStartLabel(startDate, endDate)).toBe('7d ago');
    });

    it('returns "7d ago" for undefined dates', () => {
      expect(getDateRangeStartLabel(undefined, undefined)).toBe('7d ago');
    });
  });

  describe('getDateRangeEndLabel', () => {
    it('returns end label from getDateRangeLabels', () => {
      const startDate = new Date('2024-01-08T00:00:00.000Z');
      const endDate = new Date('2024-01-15T00:00:00.000Z');
      expect(getDateRangeEndLabel(startDate, endDate)).toBe('now');
    });

    it('returns "now" for undefined dates', () => {
      expect(getDateRangeEndLabel(undefined, undefined)).toBe('now');
    });

    it('returns formatted date for historical range', () => {
      const startDate = new Date('2024-01-01T00:00:00.000Z');
      const endDate = new Date('2024-01-07T00:00:00.000Z');
      expect(getDateRangeEndLabel(startDate, endDate)).toBe('Jan 7');
    });
  });
});
