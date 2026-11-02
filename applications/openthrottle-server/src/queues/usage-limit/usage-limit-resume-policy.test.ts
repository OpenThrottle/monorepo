import { describe, expect, it } from 'vitest';

import {
  USAGE_LIMIT_RESUME_BUFFER_MS,
  USAGE_LIMIT_RESUME_MAX_CHAIN_DEPTH,
} from './usage-limit.constants.ts';
import {
  decideScheduledUsageLimitResume,
  decideUsageLimitResume,
} from './usage-limit-resume-policy.ts';

const NOW = new Date('2026-11-01T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1_000;
const at = (offsetMs: number): string =>
  new Date(NOW.getTime() + offsetMs).toISOString();

describe('decideUsageLimitResume', () => {
  it('resumes after the reset plus the safety buffer for a normal near-future reset', () => {
    expect(
      decideUsageLimitResume({
        chainDepth: 1,
        limit: { resetsAt: at(2 * HOUR_MS) },
        now: NOW,
      }),
    ).toEqual({
      delayMs: 2 * HOUR_MS + USAGE_LIMIT_RESUME_BUFFER_MS,
      kind: 'resume',
    });
  });

  it('holds when the reset time is unknown', () => {
    const decision = decideUsageLimitResume({
      chainDepth: 1,
      limit: { resetsAt: null },
      now: NOW,
    });

    expect(decision.kind).toBe('hold');
  });

  it('holds when the reset time is not a parseable instant', () => {
    expect(
      decideUsageLimitResume({
        chainDepth: 1,
        limit: { resetsAt: 'tomorrow-ish' },
        now: NOW,
      }).kind,
    ).toBe('hold');
  });

  it('holds when the reset is more than 24 hours away, and resumes at exactly 24 hours', () => {
    expect(
      decideUsageLimitResume({
        chainDepth: 1,
        limit: { resetsAt: at(24 * HOUR_MS + 1) },
        now: NOW,
      }).kind,
    ).toBe('hold');
    expect(
      decideUsageLimitResume({
        chainDepth: 1,
        limit: { resetsAt: at(24 * HOUR_MS) },
        now: NOW,
      }).kind,
    ).toBe('resume');
  });

  it('resumes after only the buffer when the reset has just passed', () => {
    expect(
      decideUsageLimitResume({
        chainDepth: 1,
        limit: { resetsAt: at(-5 * 60 * 1_000) },
        now: NOW,
      }),
    ).toEqual({ delayMs: USAGE_LIMIT_RESUME_BUFFER_MS, kind: 'resume' });
  });

  it('holds when the reported reset is far in the past', () => {
    expect(
      decideUsageLimitResume({
        chainDepth: 1,
        limit: { resetsAt: at(-3 * HOUR_MS) },
        now: NOW,
      }).kind,
    ).toBe('hold');
  });

  it('resumes below the chain bound and holds once the chain reaches it', () => {
    const limit = { resetsAt: at(HOUR_MS) };

    expect(
      decideUsageLimitResume({
        chainDepth: USAGE_LIMIT_RESUME_MAX_CHAIN_DEPTH - 1,
        limit,
        now: NOW,
      }).kind,
    ).toBe('resume');

    const held = decideUsageLimitResume({
      chainDepth: USAGE_LIMIT_RESUME_MAX_CHAIN_DEPTH,
      limit,
      now: NOW,
    });
    expect(held.kind).toBe('hold');
    expect(held.kind === 'hold' ? held.reason : '').toContain('2 usage limits');
  });
});

describe('decideScheduledUsageLimitResume', () => {
  const resumeDelayMs = 2 * HOUR_MS + USAGE_LIMIT_RESUME_BUFFER_MS;
  const limit = { resetsAt: at(2 * HOUR_MS) };

  it('matches the base policy when the job has no known next fire', () => {
    expect(
      decideScheduledUsageLimitResume({
        chainDepth: 1,
        limit,
        nextRunAt: null,
        now: NOW,
      }),
    ).toEqual(decideUsageLimitResume({ chainDepth: 1, limit, now: NOW }));
  });

  it('resumes when the next cron fire is after the resume time', () => {
    expect(
      decideScheduledUsageLimitResume({
        chainDepth: 1,
        limit,
        nextRunAt: new Date(NOW.getTime() + resumeDelayMs + 1),
        now: NOW,
      }),
    ).toEqual({ delayMs: resumeDelayMs, kind: 'resume' });
  });

  it('holds when the next cron fire is exactly at the resume time', () => {
    const decision = decideScheduledUsageLimitResume({
      chainDepth: 1,
      limit,
      nextRunAt: new Date(NOW.getTime() + resumeDelayMs),
      now: NOW,
    });

    expect(decision).toEqual({
      kind: 'hold',
      reason: 'the next scheduled run is sooner',
    });
  });

  it('holds when the next cron fire is before the resume time', () => {
    expect(
      decideScheduledUsageLimitResume({
        chainDepth: 1,
        limit,
        nextRunAt: new Date(NOW.getTime() + HOUR_MS),
        now: NOW,
      }).kind,
    ).toBe('hold');
  });

  it('keeps the base hold reasons ahead of the schedule rule', () => {
    const decision = decideScheduledUsageLimitResume({
      chainDepth: 1,
      limit: { resetsAt: null },
      nextRunAt: new Date(NOW.getTime() + 30 * HOUR_MS),
      now: NOW,
    });

    expect(decision).toEqual({
      kind: 'hold',
      reason: 'the reset time is unknown',
    });
  });

  it('still holds on chain depth', () => {
    expect(
      decideScheduledUsageLimitResume({
        chainDepth: USAGE_LIMIT_RESUME_MAX_CHAIN_DEPTH,
        limit,
        nextRunAt: null,
        now: NOW,
      }).kind,
    ).toBe('hold');
  });
});
