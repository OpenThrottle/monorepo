import { describe, expect, it } from 'vitest';
import {
  addUtcDaysToYmd,
  enumerateYmdRange,
  getPreviousUtcDayYmd,
  getUtcDayBounds,
  toYmd,
} from './daily-stats.dates';

describe('daily-stats.dates', () => {
  describe('getUtcDayBounds', () => {
    it('returns [00:00Z, next-day 00:00Z) for an arbitrary date', () => {
      const { dayEnd, dayStart } = getUtcDayBounds('2026-02-08');

      expect(dayStart.toISOString()).toBe('2026-02-08T00:00:00.000Z');
      expect(dayEnd.toISOString()).toBe('2026-02-09T00:00:00.000Z');
    });

    it('crosses month boundaries in UTC', () => {
      const { dayEnd, dayStart } = getUtcDayBounds('2026-02-28');

      expect(dayStart.toISOString()).toBe('2026-02-28T00:00:00.000Z');
      // 2026 is not a leap year → Feb 28 is the last day.
      expect(dayEnd.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    });

    it('crosses year boundaries in UTC', () => {
      const { dayEnd, dayStart } = getUtcDayBounds('2026-12-31');

      expect(dayStart.toISOString()).toBe('2026-12-31T00:00:00.000Z');
      expect(dayEnd.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    });
  });

  describe('getPreviousUtcDayYmd', () => {
    it('returns yesterday (UTC) regardless of intra-day time', () => {
      expect(getPreviousUtcDayYmd(new Date('2026-07-09T05:00:00.000Z'))).toBe(
        '2026-07-08',
      );
      expect(getPreviousUtcDayYmd(new Date('2026-07-09T23:59:59.000Z'))).toBe(
        '2026-07-08',
      );
    });

    it('rolls back across month and year boundaries', () => {
      expect(getPreviousUtcDayYmd(new Date('2026-03-01T00:30:00.000Z'))).toBe(
        '2026-02-28',
      );
      expect(getPreviousUtcDayYmd(new Date('2026-01-01T10:00:00.000Z'))).toBe(
        '2025-12-31',
      );
    });
  });

  describe('addUtcDaysToYmd', () => {
    it('adds and subtracts days across boundaries', () => {
      expect(addUtcDaysToYmd('2026-12-31', 1)).toBe('2027-01-01');
      expect(addUtcDaysToYmd('2026-03-01', -1)).toBe('2026-02-28');
      expect(addUtcDaysToYmd('2026-07-08', 0)).toBe('2026-07-08');
      expect(addUtcDaysToYmd('2026-07-08', -60)).toBe('2026-05-09');
    });
  });

  describe('enumerateYmdRange', () => {
    it('enumerates inclusive ranges chronologically, crossing month ends', () => {
      expect(enumerateYmdRange('2026-02-27', '2026-03-02')).toEqual([
        '2026-02-27',
        '2026-02-28',
        '2026-03-01',
        '2026-03-02',
      ]);
    });

    it('returns a single element when start === end', () => {
      expect(enumerateYmdRange('2026-07-08', '2026-07-08')).toEqual([
        '2026-07-08',
      ]);
    });

    it('returns empty when start is after end', () => {
      expect(enumerateYmdRange('2026-07-09', '2026-07-08')).toEqual([]);
    });
  });

  describe('toYmd', () => {
    it('normalizes date strings, ISO timestamps, and Date objects', () => {
      expect(toYmd('2026-07-08')).toBe('2026-07-08');
      expect(toYmd('2026-07-08T00:00:00.000Z')).toBe('2026-07-08');
      expect(toYmd(new Date(Date.UTC(2026, 6, 8)))).toBe('2026-07-08');
    });
  });
});
