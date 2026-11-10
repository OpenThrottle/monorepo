import { QueryFailedError } from 'typeorm';
import { describe, expect, test } from 'vitest';

import {
  createPlanScheduleConflictError,
  decidePlanSchedulability,
  isOneScheduledRunViolation,
  resolveRequestedRunner,
} from './plan-enqueue.utils.ts';

describe('decidePlanSchedulability (D2)', () => {
  test.each(['PENDING', 'BACKLOG', 'pending'])(
    '%s is schedulable',
    (status) => {
      expect(decidePlanSchedulability(status)).toEqual({ kind: 'schedulable' });
    },
  );

  test.each([
    ['SCHEDULED', 'PLAN_ALREADY_SCHEDULED'],
    ['QUEUED', 'PLAN_ACTIVE'],
    ['IN_PROGRESS', 'PLAN_ACTIVE'],
    ['BLOCKED', 'PLAN_NOT_SCHEDULABLE'],
    ['COMPLETED', 'PLAN_NOT_SCHEDULABLE'],
    ['CANCELED', 'PLAN_NOT_SCHEDULABLE'],
    ['SKIPPED', 'PLAN_NOT_SCHEDULABLE'],
    ['PROMOTED', 'PLAN_NOT_SCHEDULABLE'],
  ])('%s is a %s conflict', (status, code) => {
    expect(decidePlanSchedulability(status)).toMatchObject({
      code,
      kind: 'conflict',
    });
  });
});

describe('createPlanScheduleConflictError (D8)', () => {
  test('carries the code and the scheduled run in extensions', () => {
    const scheduledFor = new Date('2026-12-01T09:00:00.000Z');

    const error = createPlanScheduleConflictError({
      code: 'PLAN_ALREADY_SCHEDULED',
      message: 'already scheduled',
      planRunId: 'run-1',
      scheduledFor,
    });

    expect(error.message).toBe('already scheduled');
    expect(error.extensions).toEqual({
      code: 'PLAN_ALREADY_SCHEDULED',
      planRunId: 'run-1',
      scheduledFor: scheduledFor.toISOString(),
    });
  });
});

describe('isOneScheduledRunViolation', () => {
  test('matches a 23505 on the one-scheduled-run index', () => {
    expect(
      isOneScheduledRunViolation(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('duplicate key'), {
            code: '23505',
            constraint: 'plan_runs_one_scheduled_per_plan_idx',
          }),
        ),
      ),
    ).toBe(true);
  });

  test('ignores other unique violations and other errors', () => {
    expect(
      isOneScheduledRunViolation(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('duplicate key'), {
            code: '23505',
            constraint: 'plan_runs_queue_job_unique_idx',
          }),
        ),
      ),
    ).toBe(false);
    expect(isOneScheduledRunViolation(new Error('boom'))).toBe(false);
  });
});

describe('resolveRequestedRunner', () => {
  test('the request wins over the stored runner', () => {
    expect(resolveRequestedRunner('ralph', 'ot-loop')).toBe('ralph');
    expect(resolveRequestedRunner(' ot-loop ', undefined)).toBe('ot-loop');
  });

  test.each([null, undefined, '', '   '])(
    'falls back to the stored runner for %j',
    (requested) => {
      expect(resolveRequestedRunner(requested, 'ot-loop')).toBe('ot-loop');
      expect(resolveRequestedRunner(requested, undefined)).toBeUndefined();
    },
  );

  test('rejects an unknown runner', () => {
    expect(() => resolveRequestedRunner('turbo', undefined)).toThrow(
      /Invalid runner: turbo/,
    );
  });
});
