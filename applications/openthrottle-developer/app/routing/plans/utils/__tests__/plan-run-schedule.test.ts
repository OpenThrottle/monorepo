import { beforeAll, describe, expect, test } from 'vitest';

import {
  composeScheduleInstant,
  describeScheduleInstant,
  describeTimeUntil,
  formatScheduledInstant,
  formatScheduleTime,
  getDefaultScheduleInstant,
  getScheduleInstantError,
} from '../plan-run-schedule';

// 2026-11-02 12:00 PST (UTC-8; DST ended 2026-11-01).
const NOW = new Date('2026-11-02T20:00:00.000Z');
const OPTIONS = { locale: 'en-US', timeZone: 'America/Los_Angeles' } as const;

describe('plan-run-schedule', () => {
  beforeAll(() => {
    process.env.TZ = 'America/Los_Angeles';
  });

  describe('getDefaultScheduleInstant', () => {
    test('is the next whole hour at least 30 minutes away', () => {
      expect(getDefaultScheduleInstant(NOW).toISOString()).toBe(
        '2026-11-02T21:00:00.000Z',
      );
      expect(
        getDefaultScheduleInstant(
          new Date('2026-11-02T20:40:00.000Z'),
        ).toISOString(),
      ).toBe('2026-11-02T22:00:00.000Z');
    });
  });

  describe('composeScheduleInstant', () => {
    test('joins a date and HH:mm in the local zone', () => {
      const instant = composeScheduleInstant(new Date(2026, 10, 3), '15:30');

      expect(instant?.toISOString()).toBe('2026-11-03T23:30:00.000Z');
      expect(instant === undefined ? '' : formatScheduleTime(instant)).toBe(
        '15:30',
      );
    });

    test('is undefined for a missing date or a malformed time', () => {
      expect(composeScheduleInstant(undefined, '15:30')).toBeUndefined();
      expect(composeScheduleInstant(new Date(), '')).toBeUndefined();
      expect(composeScheduleInstant(new Date(), '3pm')).toBeUndefined();
    });
  });

  describe('getScheduleInstantError', () => {
    test('accepts a future instant inside 30 days', () => {
      expect(
        getScheduleInstantError(new Date('2026-12-02T19:00:00.000Z'), NOW),
      ).toBeNull();
    });

    test('rejects an instant that is not in the future', () => {
      expect(getScheduleInstantError(NOW, NOW)).toContain('already passed');
      expect(
        getScheduleInstantError(new Date('2026-11-01T00:00:00.000Z'), NOW),
      ).toContain('already passed');
    });

    test('rejects an instant more than 30 days out, and says the cap', () => {
      expect(
        getScheduleInstantError(new Date('2026-12-02T20:00:01.000Z'), NOW),
      ).toContain('30 days');
    });

    test('rejects a missing or invalid instant', () => {
      expect(getScheduleInstantError(undefined, NOW)).toContain('valid date');
      expect(getScheduleInstantError(new Date('nope'), NOW)).toContain(
        'valid date',
      );
    });
  });

  describe('describeTimeUntil', () => {
    test.each([
      [30_000, 'in less than a minute'],
      [25 * 60_000, 'in about 25 minutes'],
      [60 * 60_000, 'in about 1 hour'],
      [4 * 3_600_000, 'in about 4 hours'],
      [30 * 3_600_000, 'in about 30 hours'],
      [3 * 86_400_000, 'in about 3 days'],
    ])('%i ms ahead reads "%s"', (ms, expected) => {
      expect(describeTimeUntil(new Date(NOW.getTime() + ms), NOW)).toBe(
        expected,
      );
    });
  });

  describe('describeScheduleInstant', () => {
    test('echoes the time with its zone, then how far away it is', () => {
      expect(
        describeScheduleInstant(
          new Date('2026-11-02T23:00:00.000Z'),
          NOW,
          OPTIONS,
        ),
      ).toBe('fires 3:00 PM PST, in about 3 hours');
    });

    test('adds the date when the instant is not today', () => {
      expect(
        describeScheduleInstant(
          new Date('2026-11-04T23:00:00.000Z'),
          NOW,
          OPTIONS,
        ),
      ).toBe('fires Wed, Nov 4, 3:00 PM PST, in about 2 days');
    });
  });

  describe('formatScheduledInstant', () => {
    // Newer ICU puts a narrow no-break space before AM/PM; normalize it.
    const normalize = (text: string): string => text.replaceAll(/\s/g, ' ');

    test('renders a medium date and short time in the given zone', () => {
      expect(
        normalize(formatScheduledInstant('2026-11-03T21:00:00.000Z', OPTIONS)),
      ).toBe('Nov 3, 2026, 1:00 PM');
      expect(
        normalize(
          formatScheduledInstant(new Date('2026-11-03T21:00:00.000Z'), {
            ...OPTIONS,
            timeZone: 'UTC',
          }),
        ),
      ).toBe('Nov 3, 2026, 9:00 PM');
    });
  });
});
