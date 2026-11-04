import { afterEach, describe, expect, test, vi } from 'vitest';

import { PLAN_RUN_TRANSPARENCY_COPY } from '~/routing/plans/data/data.copy';

import { formatRunTime } from '../formatRunTime';

const NOW = new Date('2026-11-02T15:00:00.000Z');

describe('formatRunTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('when the value is unparseable', () => {
    test.each([null, undefined, '', 'not a date'])(
      'returns the copy fallback for %s',
      (value) => {
        const result = formatRunTime(value, { hydrated: true, now: NOW });

        expect(result).toEqual({
          iso: null,
          label: PLAN_RUN_TRANSPARENCY_COPY.time.unknown,
          utcLabel: PLAN_RUN_TRANSPARENCY_COPY.time.unknown,
        });
        expect(result.label).not.toMatch(/Invalid Date/);
      },
    );
  });

  describe('before hydration', () => {
    test('renders absolute UTC with the zone name, ignoring now', () => {
      const result = formatRunTime('2026-11-02T17:00:00.000Z', {
        hydrated: false,
        now: NOW,
      });

      expect(result.iso).toBe('2026-11-02T17:00:00.000Z');
      expect(result.label).toBe('Nov 2, 2026, 5:00 PM UTC');
      expect(result.utcLabel).toBe(result.label);
    });
  });

  describe('after hydration', () => {
    test('renders a future time as relative plus local weekday time', () => {
      const result = formatRunTime('2026-11-02T17:00:00.000Z', {
        hydrated: true,
        now: NOW,
      });

      expect(result.label).toMatch(
        /^in about 2 hours · \w{3} \d{1,2}:00 [AP]M$/,
      );
      expect(result.utcLabel).toBe('Nov 2, 2026, 5:00 PM UTC');
    });

    test('renders a past time as "ago" plus local weekday time', () => {
      const result = formatRunTime('2026-11-02T14:48:00.000Z', {
        hydrated: true,
        now: NOW,
      });

      expect(result.label).toMatch(/^12 minutes ago · \w{3} \d{1,2}:48 [AP]M$/);
    });

    test('renders an absolute local date when more than 7 days away', () => {
      const result = formatRunTime('2026-10-01T15:00:00.000Z', {
        hydrated: true,
        now: NOW,
      });

      expect(result.label).not.toMatch(/ago|in /);
      expect(result.label).toMatch(/^(Sep 30|Oct 1|Oct 2), 2026, /);
    });

    test('defaults now to the current time', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(NOW);
      const soon = new Date(NOW.getTime() + 60 * 60 * 1000).toISOString();

      expect(
        formatRunTime(soon, { hydrated: true, now: undefined }).label,
      ).toMatch(/^in about 1 hour · /);
    });
  });
});
