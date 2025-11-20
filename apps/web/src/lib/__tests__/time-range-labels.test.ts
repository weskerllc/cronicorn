import { describe, it, expect } from 'vitest';
import { getTimeRangeStartLabel, getTimeRangeEndLabel } from '../time-range-labels';

describe('time-range-labels', () => {
  describe('getTimeRangeStartLabel', () => {
    it('returns "1d ago" for 24h time range', () => {
      expect(getTimeRangeStartLabel('24h')).toBe('1d ago');
    });

    it('returns "7d ago" for 7d time range', () => {
      expect(getTimeRangeStartLabel('7d')).toBe('7d ago');
    });

    it('returns "30d ago" for 30d time range', () => {
      expect(getTimeRangeStartLabel('30d')).toBe('30d ago');
    });

    it('returns "30d ago" for all time range (capped at 30 days)', () => {
      expect(getTimeRangeStartLabel('all')).toBe('30d ago');
    });

    it('returns "7d ago" for undefined time range (default)', () => {
      expect(getTimeRangeStartLabel(undefined)).toBe('7d ago');
    });
  });

  describe('getTimeRangeEndLabel', () => {
    it('always returns "now"', () => {
      expect(getTimeRangeEndLabel()).toBe('now');
    });
  });
});
