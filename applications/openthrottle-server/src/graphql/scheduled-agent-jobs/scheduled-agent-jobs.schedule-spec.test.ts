import { createMock } from '@golevelup/ts-vitest';
import type { ScheduledAgentJob } from '@openthrottle/nestjs-repositories';
import { describe, expect, it } from 'vitest';

import {
  parseRunAtWithOffset,
  resolveScheduleSpec,
} from './scheduled-agent-jobs.schedule-spec.ts';

const NOW = new Date('2026-11-01T12:00:00Z');

const existingJob = (
  overrides: Partial<ScheduledAgentJob>,
): ScheduledAgentJob =>
  createMock<ScheduledAgentJob>({
    cronPattern: null,
    intervalMs: null,
    runAt: null,
    scheduleKind: 'cron',
    ...overrides,
  });

describe('parseRunAtWithOffset', () => {
  it('accepts a Z instant and a numeric offset', () => {
    expect(parseRunAtWithOffset('2026-11-03T17:00:00Z')).toEqual(
      new Date('2026-11-03T17:00:00Z'),
    );
    expect(parseRunAtWithOffset('2026-11-03T09:00-08:00')).toEqual(
      new Date('2026-11-03T17:00:00Z'),
    );
  });

  it('rejects a time with no offset, which would depend on the server timezone', () => {
    expect(parseRunAtWithOffset('2026-11-03T09:00:00')).toBeNull();
  });

  it('rejects garbage and impossible dates', () => {
    expect(parseRunAtWithOffset('tomorrow')).toBeNull();
    expect(parseRunAtWithOffset('2026-13-45T99:00:00Z')).toBeNull();
  });
});

describe('resolveScheduleSpec', () => {
  describe('when no kind is given on create', () => {
    it('defaults to cron and requires a pattern', () => {
      expect(
        resolveScheduleSpec({ cronPattern: '0 9 * * *' }, undefined, NOW),
      ).toEqual({
        ok: true,
        spec: {
          cronPattern: '0 9 * * *',
          intervalMs: null,
          runAt: null,
          scheduleKind: 'cron',
        },
      });
      expect(resolveScheduleSpec({}, undefined, NOW)).toEqual({
        ok: false,
        reason: expect.stringContaining('cron pattern'),
      });
    });
  });

  describe('when the kind is cron', () => {
    it('rejects an every-minute pattern', () => {
      expect(
        resolveScheduleSpec(
          { cronPattern: '* * * * *', scheduleKind: 'cron' },
          undefined,
          NOW,
        ).ok,
      ).toBe(false);
    });
  });

  describe('when the kind is interval', () => {
    it('keeps the interval and clears the cron pattern', () => {
      expect(
        resolveScheduleSpec(
          {
            cronPattern: '0 9 * * *',
            intervalMs: 90_000,
            scheduleKind: 'interval',
          },
          undefined,
          NOW,
        ),
      ).toEqual({
        ok: true,
        spec: {
          cronPattern: null,
          intervalMs: 90_000,
          runAt: null,
          scheduleKind: 'interval',
        },
      });
    });

    it('rejects an interval under a minute, a fraction, or none', () => {
      for (const intervalMs of [59_999, 60_000.5, null]) {
        expect(
          resolveScheduleSpec(
            { intervalMs, scheduleKind: 'interval' },
            undefined,
            NOW,
          ).ok,
        ).toBe(false);
      }
    });
  });

  describe('when the kind is once', () => {
    it('parses a future time', () => {
      expect(
        resolveScheduleSpec(
          { runAt: '2026-11-02T09:00:00-08:00', scheduleKind: 'once' },
          undefined,
          NOW,
        ),
      ).toEqual({
        ok: true,
        spec: {
          cronPattern: null,
          intervalMs: null,
          runAt: new Date('2026-11-02T17:00:00Z'),
          scheduleKind: 'once',
        },
      });
    });

    it('rejects a past time or one with no offset', () => {
      expect(
        resolveScheduleSpec(
          { runAt: '2026-10-31T09:00:00Z', scheduleKind: 'once' },
          undefined,
          NOW,
        ),
      ).toEqual({ ok: false, reason: 'runAt must be in the future.' });
      expect(
        resolveScheduleSpec(
          { runAt: '2026-11-02T09:00:00', scheduleKind: 'once' },
          undefined,
          NOW,
        ),
      ).toEqual({ ok: false, reason: expect.stringContaining('offset') });
    });
  });

  describe('when updating', () => {
    it('keeps the existing kind and fields the request leaves out', () => {
      const existing = existingJob({
        intervalMs: 120_000,
        scheduleKind: 'interval',
      });

      expect(resolveScheduleSpec({}, existing, NOW)).toEqual({
        ok: true,
        spec: {
          cronPattern: null,
          intervalMs: 120_000,
          runAt: null,
          scheduleKind: 'interval',
        },
      });
    });

    it('accepts re-saving a once time that has since passed', () => {
      const runAt = new Date('2026-10-31T09:00:00Z');
      const existing = existingJob({ runAt, scheduleKind: 'once' });

      expect(
        resolveScheduleSpec(
          { runAt: '2026-10-31T09:00:00Z', scheduleKind: 'once' },
          existing,
          NOW,
        ).ok,
      ).toBe(true);
    });

    it('requires the new field when switching kind', () => {
      const existing = existingJob({
        cronPattern: '0 9 * * *',
        scheduleKind: 'cron',
      });

      expect(
        resolveScheduleSpec({ scheduleKind: 'interval' }, existing, NOW).ok,
      ).toBe(false);
    });
  });

  describe('when the kind is unknown', () => {
    it('names the allowed kinds', () => {
      expect(
        resolveScheduleSpec({ scheduleKind: 'weekly' }, undefined, NOW),
      ).toEqual({
        ok: false,
        reason: expect.stringContaining('cron, interval, once'),
      });
    });
  });
});
