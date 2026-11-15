import { describe, expect, it } from 'vitest';

import {
  computeNextSlot,
  computePreviousSlot,
  validatePlanRunScheduleCron,
} from './plan-run-schedule.utils.ts';

describe('computeNextSlot', () => {
  it('computes the next slot strictly after the given instant, in UTC by default', () => {
    expect(
      computeNextSlot({
        after: new Date('2026-11-14T12:00:00.000Z'),
        cronPattern: '0 9 * * *',
        timezone: null,
      }),
    ).toEqual(new Date('2026-11-15T09:00:00.000Z'));
  });

  it('is strictly after: an instant exactly on a slot yields the next one', () => {
    expect(
      computeNextSlot({
        after: new Date('2026-11-14T09:00:00.000Z'),
        cronPattern: '0 9 * * *',
        timezone: 'UTC',
      }),
    ).toEqual(new Date('2026-11-15T09:00:00.000Z'));
  });

  it('returns null for an unparsable pattern or an unknown timezone', () => {
    const after = new Date('2026-11-14T12:00:00.000Z');

    expect(
      computeNextSlot({ after, cronPattern: 'not a cron', timezone: null }),
    ).toBeNull();
    expect(
      computeNextSlot({
        after,
        cronPattern: '0 9 * * *',
        timezone: 'Mars/Olympus',
      }),
    ).toBeNull();
  });

  describe('DST in America/New_York ("0 9 * * *" stays 09:00 local)', () => {
    const zone = 'America/New_York';
    const slotAfter = (after: string): string | undefined => {
      return computeNextSlot({
        after: new Date(after),
        cronPattern: '0 9 * * *',
        timezone: zone,
      })?.toISOString();
    };

    it('spring forward (2026-03-08): the UTC instant shifts from 14:00Z to 13:00Z', () => {
      expect(slotAfter('2026-03-07T15:00:00.000Z')).toBe(
        '2026-03-08T13:00:00.000Z',
      );
      expect(slotAfter('2026-03-06T15:00:00.000Z')).toBe(
        '2026-03-07T14:00:00.000Z',
      );
    });

    it('fall back (2026-11-01): the UTC instant shifts from 13:00Z to 14:00Z', () => {
      expect(slotAfter('2026-10-31T15:00:00.000Z')).toBe(
        '2026-11-01T14:00:00.000Z',
      );
      expect(slotAfter('2026-10-30T15:00:00.000Z')).toBe(
        '2026-10-31T13:00:00.000Z',
      );
    });
  });
});

describe('computePreviousSlot', () => {
  it('returns the latest slot at or before the instant', () => {
    expect(
      computePreviousSlot({
        at: new Date('2026-11-14T12:00:00.000Z'),
        cronPattern: '0 9 * * *',
        timezone: null,
      }),
    ).toEqual(new Date('2026-11-14T09:00:00.000Z'));
  });

  it('counts a slot exactly at the instant', () => {
    expect(
      computePreviousSlot({
        at: new Date('2026-11-14T09:00:00.000Z'),
        cronPattern: '0 9 * * *',
        timezone: null,
      }),
    ).toEqual(new Date('2026-11-14T09:00:00.000Z'));
  });

  it('returns null for an invalid pattern', () => {
    expect(
      computePreviousSlot({
        at: new Date('2026-11-14T12:00:00.000Z'),
        cronPattern: 'nope',
        timezone: null,
      }),
    ).toBeNull();
  });
});

describe('validatePlanRunScheduleCron', () => {
  const now = new Date('2026-11-14T12:00:00.000Z');

  it('accepts an hourly pattern (exactly the minimum gap)', () => {
    expect(validatePlanRunScheduleCron('0 * * * *', null, now)).toEqual({
      ok: true,
    });
  });

  it('accepts a daily pattern in a named timezone, DST transitions included', () => {
    expect(
      validatePlanRunScheduleCron(
        '0 9 * * *',
        'America/New_York',
        new Date('2026-10-25T12:00:00.000Z'),
      ),
    ).toEqual({ ok: true });
  });

  it('accepts an hourly pattern across a DST fall-back', () => {
    expect(
      validatePlanRunScheduleCron(
        '0 * * * *',
        'America/New_York',
        new Date('2026-10-31T12:00:00.000Z'),
      ),
    ).toEqual({ ok: true });
  });

  it('rejects a pattern whose consecutive slots are under an hour apart', () => {
    const result = validatePlanRunScheduleCron('*/30 * * * *', null, now);

    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/at least 60 minutes apart/);
  });

  it('rejects an uneven pattern when only some gaps are short', () => {
    expect(validatePlanRunScheduleCron('0,15 9 * * *', null, now).ok).toBe(
      false,
    );
  });

  it('rejects an unknown timezone', () => {
    const result = validatePlanRunScheduleCron(
      '0 9 * * *',
      'Mars/Olympus',
      now,
    );

    expect(result).toEqual({
      ok: false,
      reason: 'Unknown timezone "Mars/Olympus".',
    });
  });

  it('rejects what the shared agent-job validator rejects (every minute, bad field count)', () => {
    expect(validatePlanRunScheduleCron('* * * * *', null, now).ok).toBe(false);
    expect(validatePlanRunScheduleCron('0 9 * *', null, now).ok).toBe(false);
  });

  it('rejects a pattern cron-parser cannot read', () => {
    const result = validatePlanRunScheduleCron('0 99 * * *', null, now);

    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Could not read the cron pattern/);
  });
});
