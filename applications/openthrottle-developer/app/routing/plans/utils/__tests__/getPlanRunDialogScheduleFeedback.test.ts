import { describe, expect, it } from 'vitest';

import { getPlanRunDialogScheduleFeedback } from '../getPlanRunDialogScheduleFeedback';

const now = new Date('2030-01-01T12:00:00Z');

describe('getPlanRunDialogScheduleFeedback', () => {
  it('returns no feedback outside schedule mode', () => {
    expect(
      getPlanRunDialogScheduleFeedback({
        instant: undefined,
        isScheduleMode: false,
        now,
      }),
    ).toEqual({ scheduleError: null, scheduleSummary: undefined });
  });

  it('reports an error and no summary when no instant is picked', () => {
    const feedback = getPlanRunDialogScheduleFeedback({
      instant: undefined,
      isScheduleMode: true,
      now,
    });

    expect(feedback.scheduleError).not.toBeNull();
    expect(feedback.scheduleSummary).toBeUndefined();
  });

  it('reports an error and no summary for a past instant', () => {
    const feedback = getPlanRunDialogScheduleFeedback({
      instant: new Date('2029-12-31T12:00:00Z'),
      isScheduleMode: true,
      now,
    });

    expect(feedback.scheduleError).not.toBeNull();
    expect(feedback.scheduleSummary).toBeUndefined();
  });

  it('summarizes a future instant', () => {
    const feedback = getPlanRunDialogScheduleFeedback({
      instant: new Date('2030-01-01T15:00:00Z'),
      isScheduleMode: true,
      now,
    });

    expect(feedback.scheduleError).toBeNull();
    expect(feedback.scheduleSummary).toEqual(expect.any(String));
  });
});
