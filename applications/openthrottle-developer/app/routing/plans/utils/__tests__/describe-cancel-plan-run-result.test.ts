import { describe, expect, test } from 'vitest';
import { describeCancelPlanRunResult } from '../describe-cancel-plan-run-result';
import type { PlanDetailCancelPlanRunMutation } from '~/__generated__/graphql';

type CancelPayload = PlanDetailCancelPlanRunMutation['cancelPlanRun'];

const basePayload = (
  overrides: Partial<CancelPayload> = {},
): CancelPayload => ({
  __typename: 'CancelPlanRunResultObject',
  activeJobIdsCouldNotCancel: [],
  noMatchingJob: false,
  planId: 'p1',
  planStatusAfter: null,
  removedJobIds: [],
  signaledActiveRunToStop: false,
  ...overrides,
});

describe('describeCancelPlanRunResult', () => {
  test('returns no-job message when noMatchingJob is true', () => {
    expect(
      describeCancelPlanRunResult(
        basePayload({ noMatchingJob: true, removedJobIds: ['x'] }),
      ),
    ).toBe('No queued or active plan run was found for this plan.');
  });

  test('describes a single removed job', () => {
    expect(
      describeCancelPlanRunResult(
        basePayload({ noMatchingJob: false, removedJobIds: ['job-a'] }),
      ),
    ).toBe('Removed 1 queued job.');
  });

  test('uses plural when multiple jobs removed', () => {
    expect(
      describeCancelPlanRunResult(basePayload({ removedJobIds: ['a', 'b'] })),
    ).toBe('Removed 2 queued jobs.');
  });

  test('describes signaled active stop without listing locked ids', () => {
    expect(
      describeCancelPlanRunResult(
        basePayload({
          activeJobIdsCouldNotCancel: ['locked-1'],
          removedJobIds: [],
          signaledActiveRunToStop: true,
        }),
      ),
    ).toBe(
      'Signaled the worker to stop the in-flight run (Ralph may take a moment to shut down).',
    );
  });

  test('combines removed jobs and signal message', () => {
    expect(
      describeCancelPlanRunResult(
        basePayload({
          removedJobIds: ['w1'],
          signaledActiveRunToStop: true,
        }),
      ),
    ).toBe(
      'Removed 1 queued job. Signaled the worker to stop the in-flight run (Ralph may take a moment to shut down).',
    );
  });

  test('lists locked active job ids when not signaled', () => {
    expect(
      describeCancelPlanRunResult(
        basePayload({
          activeJobIdsCouldNotCancel: ['j1', 'j2'],
          signaledActiveRunToStop: false,
        }),
      ),
    ).toBe('Some jobs could not be removed while active (j1, j2).');
  });

  test('returns generic completion when nothing specific applied', () => {
    expect(
      describeCancelPlanRunResult(
        basePayload({
          activeJobIdsCouldNotCancel: [],
          noMatchingJob: false,
          removedJobIds: [],
          signaledActiveRunToStop: false,
        }),
      ),
    ).toBe('Plan run cancellation completed.');
  });
});
