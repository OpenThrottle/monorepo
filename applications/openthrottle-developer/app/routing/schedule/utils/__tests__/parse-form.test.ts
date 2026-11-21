import { describe, expect, test } from 'vitest';

import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';

import { missingScheduleTiming } from '../parse-form';

describe('missingScheduleTiming', () => {
  describe('when no kind is chosen', () => {
    test('requires a cron pattern, as cron is the default', () => {
      expect(missingScheduleTiming({})).toBe(SCHEDULE_COPY.missingCronPattern);
      expect(missingScheduleTiming({ cronPattern: '0 9 * * *' })).toBeNull();
    });
  });

  describe('when the kind is interval', () => {
    test('requires the interval', () => {
      expect(missingScheduleTiming({ scheduleKind: 'interval' })).toBe(
        SCHEDULE_COPY.missingInterval,
      );
      expect(
        missingScheduleTiming({ intervalMs: 60_000, scheduleKind: 'interval' }),
      ).toBeNull();
    });
  });

  describe('when the kind is once', () => {
    test('requires the time, not a cron pattern', () => {
      expect(
        missingScheduleTiming({
          cronPattern: '0 9 * * *',
          scheduleKind: 'once',
        }),
      ).toBe(SCHEDULE_COPY.missingRunAt);
      expect(
        missingScheduleTiming({
          runAt: '2026-11-03T17:00:00Z',
          scheduleKind: 'once',
        }),
      ).toBeNull();
    });
  });
});
