import {
  formatMisfireDuration,
  listCronSlotsBetween,
  missedOnPickupMessage,
  planBootMisfire,
  shouldRunLateFire,
  slotMillisFromJobId,
} from './scheduled-agent-jobs.misfire.ts';

const at = (iso: string): Date => new Date(iso);
const TEN_MIN = 10 * 60_000;

describe('slotMillisFromJobId', () => {
  it('reads the slot from a job-scheduler job id', () => {
    expect(slotMillisFromJobId('repeat:scheduled-job:3f1c:1767225600000')).toBe(
      1767225600000,
    );
  });

  it('returns null for a run-now, resume or catch-up job id', () => {
    expect(slotMillisFromJobId('9b2d6d4e-run')).toBeNull();
    expect(
      slotMillisFromJobId('scheduled-job-catchup-3f1c-1767225600000'),
    ).toBeNull();
    expect(slotMillisFromJobId(undefined)).toBeNull();
  });

  it('returns null when the slot segment is not a number', () => {
    expect(slotMillisFromJobId('repeat:scheduled-job:3f1c:abc')).toBeNull();
  });
});

describe('shouldRunLateFire', () => {
  describe('when the fire is within the threshold', () => {
    it('runs under either policy', () => {
      expect(
        shouldRunLateFire({
          latenessMs: TEN_MIN,
          policy: 'skip',
          thresholdMs: TEN_MIN,
        }),
      ).toBe(true);
      expect(
        shouldRunLateFire({
          latenessMs: 1_000,
          policy: 'catch_up_once',
          thresholdMs: TEN_MIN,
        }),
      ).toBe(true);
    });
  });

  describe('when the fire is beyond the threshold', () => {
    it('skips under skip', () => {
      expect(
        shouldRunLateFire({
          latenessMs: TEN_MIN + 1,
          policy: 'skip',
          thresholdMs: TEN_MIN,
        }),
      ).toBe(false);
    });

    it('runs under catch_up_once', () => {
      expect(
        shouldRunLateFire({
          latenessMs: 3 * 24 * 60 * 60_000,
          policy: 'catch_up_once',
          thresholdMs: TEN_MIN,
        }),
      ).toBe(true);
    });
  });
});

describe('listCronSlotsBetween', () => {
  it('lists the slots in (after, before], ascending', () => {
    const { droppedCount, slots } = listCronSlotsBetween({
      after: at('2026-11-02T09:00:00Z'),
      before: at('2026-11-02T10:00:00Z'),
      cronPattern: '*/15 * * * *',
      limit: 50,
      timezone: null,
    });

    expect(slots.map((slot) => slot.toISOString())).toEqual([
      '2026-11-02T09:15:00.000Z',
      '2026-11-02T09:30:00.000Z',
      '2026-11-02T09:45:00.000Z',
      '2026-11-02T10:00:00.000Z',
    ]);
    expect(droppedCount).toBe(0);
  });

  it('keeps only the most recent slots past the limit and counts the rest', () => {
    const { droppedCount, slots } = listCronSlotsBetween({
      after: at('2026-11-02T00:00:00Z'),
      before: at('2026-11-02T10:00:00Z'),
      cronPattern: '0 * * * *',
      limit: 3,
      timezone: null,
    });

    expect(slots.map((slot) => slot.toISOString())).toEqual([
      '2026-11-02T08:00:00.000Z',
      '2026-11-02T09:00:00.000Z',
      '2026-11-02T10:00:00.000Z',
    ]);
    expect(droppedCount).toBe(7);
  });

  it('interprets the pattern in the schedule timezone', () => {
    const { slots } = listCronSlotsBetween({
      after: at('2026-11-02T00:00:00Z'),
      before: at('2026-11-03T00:00:00Z'),
      cronPattern: '0 9 * * *',
      limit: 50,
      timezone: 'America/New_York',
    });

    expect(slots.map((slot) => slot.toISOString())).toEqual([
      '2026-11-02T14:00:00.000Z',
    ]);
  });

  it('returns nothing for an empty window', () => {
    expect(
      listCronSlotsBetween({
        after: at('2026-11-02T09:01:00Z'),
        before: at('2026-11-02T09:14:00Z'),
        cronPattern: '*/15 * * * *',
        limit: 50,
        timezone: null,
      }).slots,
    ).toEqual([]);
  });
});

describe('planBootMisfire', () => {
  const now = at('2026-11-02T12:00:00Z');
  const slots = [
    at('2026-11-02T09:00:00Z'),
    at('2026-11-02T10:00:00Z'),
    at('2026-11-02T11:00:00Z'),
  ];

  it('plans nothing when no slot was missed', () => {
    expect(
      planBootMisfire({ now, policy: 'skip', slots: [], thresholdMs: TEN_MIN }),
    ).toEqual({ catchUpSlot: null, lateSlots: [], supersededSlots: [] });
  });

  describe('when the policy is skip', () => {
    it('records every slot late once the latest is beyond the threshold', () => {
      expect(
        planBootMisfire({ now, policy: 'skip', slots, thresholdMs: TEN_MIN }),
      ).toEqual({ catchUpSlot: null, lateSlots: slots, supersededSlots: [] });
    });

    it('still runs the latest slot when it is within the threshold', () => {
      const recent = [...slots, at('2026-11-02T11:55:00Z')];

      expect(
        planBootMisfire({
          now,
          policy: 'skip',
          slots: recent,
          thresholdMs: TEN_MIN,
        }),
      ).toEqual({
        catchUpSlot: at('2026-11-02T11:55:00Z'),
        lateSlots: [],
        supersededSlots: slots,
      });
    });
  });

  describe('when the policy is catch_up_once', () => {
    it('runs only the most recent slot, however late, and supersedes the rest', () => {
      expect(
        planBootMisfire({
          now,
          policy: 'catch_up_once',
          slots,
          thresholdMs: TEN_MIN,
        }),
      ).toEqual({
        catchUpSlot: at('2026-11-02T11:00:00Z'),
        lateSlots: [],
        supersededSlots: slots.slice(0, 2),
      });
    });
  });
});

describe('missed-run messages', () => {
  it('formats whole minutes as minutes and anything else as seconds', () => {
    expect(formatMisfireDuration(TEN_MIN)).toBe('10 min');
    expect(formatMisfireDuration(90_000)).toBe('90 s');
  });

  it('names the lateness, threshold and policy for a fire skipped at pickup', () => {
    const message = missedOnPickupMessage({
      latenessMs: 42 * 60_000 + 5_000,
      policy: 'skip',
      thresholdMs: TEN_MIN,
    });

    expect(message).toContain('42 min');
    expect(message).toContain('10 min');
    expect(message).toContain('skip');
  });
});
