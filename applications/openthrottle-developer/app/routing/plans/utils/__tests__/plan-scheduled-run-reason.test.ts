import { describe, expect, it } from 'vitest';

import {
  getPlanScheduledForTitle,
  getPlanScheduledRunReason,
} from '../plan-scheduled-run-reason';

const PINNED = { locale: 'en-US', timeZone: 'UTC' } as const;

describe('getPlanScheduledRunReason', () => {
  it('explains a pending scheduled run in the viewer local time and says how to run now', () => {
    const reason = getPlanScheduledRunReason(
      new Date('2026-08-01T09:30:00Z'),
      PINNED,
    );

    expect(reason).toBe(
      'A run is scheduled for Aug 1, 2026, 9:30 AM; running now will unschedule it first.',
    );
  });

  it('renders the same instant differently for a different time zone', () => {
    const reason = getPlanScheduledRunReason('2026-08-01T09:30:00.000Z', {
      locale: 'en-US',
      timeZone: 'America/Los_Angeles',
    });

    expect(reason).toBe(
      'A run is scheduled for Aug 1, 2026, 2:30 AM; running now will unschedule it first.',
    );
  });

  it('accepts the ISO string a GraphQL DateTime arrives as', () => {
    expect(
      getPlanScheduledRunReason('2026-08-01T09:30:00.000Z', PINNED),
    ).toContain('Aug 1, 2026');
  });

  it.each([null, undefined])(
    'returns null when nothing is scheduled (%s)',
    (value) => {
      expect(getPlanScheduledRunReason(value, PINNED)).toBeNull();
    },
  );

  it('returns null for a value that is not a valid instant', () => {
    expect(getPlanScheduledRunReason('not-a-date', PINNED)).toBeNull();
  });
});

describe('getPlanScheduledForTitle', () => {
  it('names the scheduled time for a SCHEDULED badge', () => {
    expect(getPlanScheduledForTitle('2026-08-01T09:30:00.000Z')).toMatch(
      /^Scheduled for /,
    );
  });

  it('is undefined when nothing valid is scheduled', () => {
    expect(getPlanScheduledForTitle(null)).toBeUndefined();
    expect(getPlanScheduledForTitle('not-a-date')).toBeUndefined();
  });
});
