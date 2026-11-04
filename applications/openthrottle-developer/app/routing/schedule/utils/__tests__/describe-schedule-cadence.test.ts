import { describe, expect, test } from 'vitest';

import { SCHEDULE_CADENCE_COPY } from '~/routing/schedule/data/data.copy';

import {
  describeScheduleCadence,
  type ScheduleCadenceFields,
} from '../describe-schedule-cadence';

const cadence = (overrides: Partial<ScheduleCadenceFields>): string =>
  describeScheduleCadence({
    cronPattern: null,
    intervalMs: null,
    runAt: null,
    scheduleKind: 'cron',
    timezone: null,
    ...overrides,
  });

describe('describeScheduleCadence', () => {
  describe('when the schedule is cron', () => {
    test('shows the pattern with its timezone, UTC when none', () => {
      expect(cadence({ cronPattern: '0 9 * * *' })).toBe(
        SCHEDULE_CADENCE_COPY.cron('0 9 * * *', null),
      );
      expect(
        cadence({ cronPattern: '0 9 * * *', timezone: 'Europe/Berlin' }),
      ).toContain('Europe/Berlin');
    });
  });

  describe('when the schedule is an interval', () => {
    test('shows it in minutes', () => {
      expect(
        cadence({ intervalMs: 90 * 60_000, scheduleKind: 'interval' }),
      ).toBe(SCHEDULE_CADENCE_COPY.interval(90));
    });
  });

  describe('when the schedule runs once', () => {
    test('shows the ISO time, so server and browser render the same text', () => {
      expect(
        cadence({ runAt: '2026-11-03T17:00:00.000Z', scheduleKind: 'once' }),
      ).toBe(SCHEDULE_CADENCE_COPY.once('2026-11-03T17:00:00.000Z'));
    });
  });

  describe('when the kind is missing its field', () => {
    test('falls back to the unknown label', () => {
      expect(cadence({ scheduleKind: 'interval' })).toBe(
        SCHEDULE_CADENCE_COPY.unknown,
      );
    });
  });
});
