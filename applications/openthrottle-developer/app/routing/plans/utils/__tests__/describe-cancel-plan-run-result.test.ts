import { describe, expect, test } from 'vitest';
import {
  cancelPlanRunToastTone,
  describeCancelPlanRunResult,
} from '../describe-cancel-plan-run-result';
import type { PlanDetailCancelPlanRunMutation } from '~/__generated__/graphql';

type CancelPayload = PlanDetailCancelPlanRunMutation['cancelPlanRun'];

const basePayload = (
  overrides: Partial<CancelPayload> = {},
): CancelPayload => ({
  __typename: 'CancelPlanRunResultObject',
  activeJobIdsCouldNotCancel: [],
  cancelRequested: false,
  noMatchingJob: false,
  outcome: 'NO_ACTIVE_RUN',
  planId: 'p1',
  planStatusAfter: null,
  removedJobIds: [],
  signaledActiveRunToStop: false,
  ...overrides,
});

describe('describeCancelPlanRunResult', () => {
  test('RUN_CANCELLED describes a single removed job', () => {
    expect(
      describeCancelPlanRunResult(
        basePayload({ outcome: 'RUN_CANCELLED', removedJobIds: ['job-a'] }),
      ),
    ).toBe('Run cancelled — removed 1 queued job from the queue.');
  });

  test('RUN_CANCELLED pluralizes multiple removed jobs', () => {
    expect(
      describeCancelPlanRunResult(
        basePayload({ outcome: 'RUN_CANCELLED', removedJobIds: ['a', 'b'] }),
      ),
    ).toBe('Run cancelled — removed 2 queued jobs from the queue.');
  });

  test('RUN_STOPPING describes signaling the active run (no locked ids leaked)', () => {
    expect(
      describeCancelPlanRunResult(
        basePayload({
          activeJobIdsCouldNotCancel: ['locked-1'],
          outcome: 'RUN_STOPPING',
          signaledActiveRunToStop: true,
        }),
      ),
    ).toBe(
      'Run stopping — signaled the worker to terminate the active run (Ralph may take a moment to shut down).',
    );
  });

  test('CANCELLATION_REQUESTED describes a checkpoint stop', () => {
    expect(
      describeCancelPlanRunResult(
        basePayload({
          cancelRequested: true,
          outcome: 'CANCELLATION_REQUESTED',
        }),
      ),
    ).toBe('Cancellation requested — the run stops at its next checkpoint.');
  });

  test('NO_ACTIVE_RUN describes an explicit no-op', () => {
    expect(
      describeCancelPlanRunResult(basePayload({ outcome: 'NO_ACTIVE_RUN' })),
    ).toBe('No queued or active plan run was found to cancel.');
  });
});

describe('cancelPlanRunToastTone', () => {
  test('NO_ACTIVE_RUN is info (never a misleading success)', () => {
    expect(
      cancelPlanRunToastTone(basePayload({ outcome: 'NO_ACTIVE_RUN' })),
    ).toBe('info');
  });

  test.each(['RUN_CANCELLED', 'RUN_STOPPING', 'CANCELLATION_REQUESTED'])(
    '%s is success',
    (outcome) => {
      expect(cancelPlanRunToastTone(basePayload({ outcome }))).toBe('success');
    },
  );
});
