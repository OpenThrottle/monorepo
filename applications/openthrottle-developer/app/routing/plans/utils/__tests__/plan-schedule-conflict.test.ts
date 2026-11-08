import { GraphqlResponseError } from '@openthrottle/react-router-graphql';
import { describe, expect, test } from 'vitest';

import { PLAN_SCHEDULE_CONFIRM_COPY } from '~/routing/plans/data/data.copy';

import {
  PLAN_SCHEDULE_CONFLICT_CODE,
  readPlanScheduleConflict,
  readPlanScheduleConflictFromData,
  readPlanScheduleFailure,
} from '../plan-schedule-conflict';

const SCHEDULED_FOR = '2026-11-08T17:00:00.000Z';

const conflictError = (code: string): GraphqlResponseError => {
  return new GraphqlResponseError('GraphQL errors: conflict', {
    code,
    planRunId: 'run-1',
    scheduledFor: SCHEDULED_FOR,
  });
};

describe('readPlanScheduleConflict', () => {
  test('reads the code, run id and fire time off the error extensions', () => {
    expect(
      readPlanScheduleConflict(
        conflictError(PLAN_SCHEDULE_CONFLICT_CODE.PLAN_ALREADY_SCHEDULED),
      ),
    ).toEqual({
      code: 'PLAN_ALREADY_SCHEDULED',
      planRunId: 'run-1',
      scheduledFor: SCHEDULED_FOR,
    });
  });

  test('turns a null or missing run into null', () => {
    const error = new GraphqlResponseError('x', { code: 'PLAN_ACTIVE' });

    expect(readPlanScheduleConflict(error)).toEqual({
      code: 'PLAN_ACTIVE',
      planRunId: null,
      scheduledFor: null,
    });
  });

  test('ignores an unknown code, a plain Error and a non-error', () => {
    expect(readPlanScheduleConflict(conflictError('OTHER'))).toBeUndefined();
    expect(readPlanScheduleConflict(new Error('boom'))).toBeUndefined();
    expect(readPlanScheduleConflict('boom')).toBeUndefined();
  });
});

describe('readPlanScheduleConflictFromData', () => {
  test('reads a conflict stored under the given key', () => {
    expect(
      readPlanScheduleConflictFromData(
        {
          runPlanConflict: {
            code: 'PLAN_ALREADY_SCHEDULED',
            planRunId: 'run-1',
            scheduledFor: SCHEDULED_FOR,
          },
        },
        'runPlanConflict',
      ),
    ).toEqual({
      code: 'PLAN_ALREADY_SCHEDULED',
      planRunId: 'run-1',
      scheduledFor: SCHEDULED_FOR,
    });
  });

  test('is undefined for missing data, a missing key or a malformed value', () => {
    expect(readPlanScheduleConflictFromData(undefined, 'k')).toBeUndefined();
    expect(readPlanScheduleConflictFromData({}, 'k')).toBeUndefined();
    expect(
      readPlanScheduleConflictFromData({ k: { code: 'NOPE' } }, 'k'),
    ).toBeUndefined();
  });
});

describe('readPlanScheduleFailure', () => {
  test('hands PLAN_ALREADY_SCHEDULED back as a conflict to confirm', () => {
    expect(
      readPlanScheduleFailure(
        conflictError(PLAN_SCHEDULE_CONFLICT_CODE.PLAN_ALREADY_SCHEDULED),
        'fallback',
      ),
    ).toEqual({
      conflict: {
        code: 'PLAN_ALREADY_SCHEDULED',
        planRunId: 'run-1',
        scheduledFor: SCHEDULED_FOR,
      },
    });
  });

  test('turns PLAN_ACTIVE and PLAN_NOT_SCHEDULABLE into clear messages', () => {
    expect(
      readPlanScheduleFailure(
        conflictError(PLAN_SCHEDULE_CONFLICT_CODE.PLAN_ACTIVE),
        'fallback',
      ),
    ).toEqual({ message: PLAN_SCHEDULE_CONFIRM_COPY.conflictActive });
    expect(
      readPlanScheduleFailure(
        conflictError(PLAN_SCHEDULE_CONFLICT_CODE.PLAN_NOT_SCHEDULABLE),
        'fallback',
      ),
    ).toEqual({ message: PLAN_SCHEDULE_CONFIRM_COPY.conflictNotSchedulable });
  });

  test('keeps any other error message, or the fallback when it has none', () => {
    expect(readPlanScheduleFailure(new Error('network down'), 'fb')).toEqual({
      message: 'network down',
    });
    expect(readPlanScheduleFailure(new Error('   '), 'fb')).toEqual({
      message: 'fb',
    });
  });
});
