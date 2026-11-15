import { describe, expect, test } from 'vitest';

import { buildPlanRunSchedule } from '../../testing/buildPlanRunSchedule';
import {
  buildRepeatCronPattern,
  buildRunOverridesJson,
  describeCronPattern,
  describeRunSchedule,
  getRepeatDisabledReason,
  isCronPatternShape,
  isPlanRunRepeat,
  selectEnabledSchedule,
  selectScheduleForRun,
} from '../plan-run-repeat';

// Local-time constructor: Monday 2026-11-02 13:05 in whatever zone the runner uses, which is the
// zone the dialog reads the picked date and time in.
const MONDAY_1305 = new Date(2026, 10, 2, 13, 5);

describe('plan-run-repeat', () => {
  describe('buildRepeatCronPattern', () => {
    test('derives Daily, Weekdays and Weekly from the picked local date and time', () => {
      const base = { customCron: '', instant: MONDAY_1305 };

      expect(buildRepeatCronPattern({ ...base, repeat: 'daily' })).toBe(
        '5 13 * * *',
      );
      expect(buildRepeatCronPattern({ ...base, repeat: 'weekdays' })).toBe(
        '5 13 * * 1-5',
      );
      expect(buildRepeatCronPattern({ ...base, repeat: 'weekly' })).toBe(
        '5 13 * * 1',
      );
    });

    test('returns nothing for a one-off or a missing instant', () => {
      expect(
        buildRepeatCronPattern({
          customCron: '',
          instant: MONDAY_1305,
          repeat: 'none',
        }),
      ).toBeUndefined();
      expect(
        buildRepeatCronPattern({
          customCron: '',
          instant: undefined,
          repeat: 'daily',
        }),
      ).toBeUndefined();
    });

    test('passes a five-field custom cron through, normalizing spaces, and rejects the rest', () => {
      const base = { instant: undefined, repeat: 'custom' } as const;

      expect(
        buildRepeatCronPattern({ ...base, customCron: '  0  9 * * 1-5 ' }),
      ).toBe('0 9 * * 1-5');
      expect(
        buildRepeatCronPattern({ ...base, customCron: '0 9 * *' }),
      ).toBeUndefined();
    });
  });

  describe('describeCronPattern', () => {
    test('renders a readable rule starting lower-case', () => {
      expect(describeCronPattern('0 9 * * 1-5')).toMatch(
        /^at 09:00 AM, Monday through Friday/,
      );
    });

    test('returns undefined for a pattern it cannot read', () => {
      expect(describeCronPattern('nonsense')).toBeUndefined();
    });
  });

  describe('buildRunOverridesJson', () => {
    test('keeps only branch, effort, iterations and model', () => {
      const json = buildRunOverridesJson({
        branch: 'feat/x',
        priority: 1,
        ralph: { backend: 'claude', effort: 'high', iterations: 4, model: 'm' },
        runner: 'ralph',
      });

      expect(JSON.parse(json ?? '')).toEqual({
        branch: 'feat/x',
        effort: 'high',
        iterations: 4,
        model: 'm',
      });
    });

    test('is undefined when nothing is set', () => {
      expect(buildRunOverridesJson({ branch: ' ' })).toBeUndefined();
    });
  });

  describe('schedule selectors', () => {
    const schedule = buildPlanRunSchedule();
    const paused = buildPlanRunSchedule({
      enabled: false,
      id: 'schedule-2',
      pendingPlanRunId: null,
    });

    test('selectScheduleForRun matches the pending occurrence', () => {
      expect(selectScheduleForRun([paused, schedule], 'run-9')).toBe(schedule);
      expect(selectScheduleForRun([schedule], 'run-1')).toBeUndefined();
    });

    test('selectEnabledSchedule ignores a paused schedule', () => {
      expect(selectEnabledSchedule([paused])).toBeUndefined();
      expect(selectEnabledSchedule([paused, schedule])).toBe(schedule);
    });

    test('getRepeatDisabledReason names the existing rule, or is undefined', () => {
      expect(getRepeatDisabledReason([paused])).toBeUndefined();
      expect(getRepeatDisabledReason([schedule])).toContain(
        describeRunSchedule(schedule),
      );
    });
  });

  test('isCronPatternShape counts five fields', () => {
    expect(isCronPatternShape('* * * * *')).toBe(true);
    expect(isCronPatternShape('* * *')).toBe(false);
  });

  test('isPlanRunRepeat narrows only the known values', () => {
    expect(isPlanRunRepeat('weekly')).toBe(true);
    expect(isPlanRunRepeat('hourly')).toBe(false);
  });
});
