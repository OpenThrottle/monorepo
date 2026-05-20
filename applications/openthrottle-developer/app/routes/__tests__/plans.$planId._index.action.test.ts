import { describe, expect, test, vi, beforeEach } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { action } from '../plans.$planId._index';
import {
  PlanDetailCancelPlanRunDocument,
  PlanDetailEnqueuePlanRunDocument,
  type PlanDetailCancelPlanRunMutation,
} from '~/__generated__/graphql';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

describe('routes/plans.$planId._index action (runPlan)', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  test('calls enqueuePlanRun without ralph when ralphTuning form field is empty', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue({
      enqueuePlanRun: {
        jobId: 'job-1',
        planId: '80864bba-630a-451d-bfd2-4b25ec202381',
      },
    });

    const formData = new FormData();
    formData.set('intent', 'runPlan');
    formData.set('ralphTuning', '');

    const request = new Request(
      'http://localhost/plans/80864bba-630a-451d-bfd2-4b25ec202381',
      {
        body: formData,
        method: 'POST',
      },
    );

    await action({
      context: {},
      params: { planId: '80864bba-630a-451d-bfd2-4b25ec202381' },
      request,
      unstable_pattern: '/plans/:planId',
    });

    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      request,
      PlanDetailEnqueuePlanRunDocument,
      {
        input: {
          planId: '80864bba-630a-451d-bfd2-4b25ec202381',
          priority: 1,
        },
      },
    );
  });

  test('passes jobRunHooksJson into enqueuePlanRun when form field is valid', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue({
      enqueuePlanRun: {
        jobId: 'job-hooks',
        planId: '80864bba-630a-451d-bfd2-4b25ec202381',
      },
    });

    const hooksPayload = JSON.stringify({
      hooks: [
        {
          kind: 'prompt_profile',
          phase: 'before_run',
          prompt: '/agents/ralph',
          promptDelivery: 'named',
        },
      ],
    });

    const formData = new FormData();
    formData.set('intent', 'runPlan');
    formData.set('jobRunHooksJson', hooksPayload);

    const request = new Request(
      'http://localhost/plans/80864bba-630a-451d-bfd2-4b25ec202381',
      {
        body: formData,
        method: 'POST',
      },
    );

    await action({
      context: {},
      params: { planId: '80864bba-630a-451d-bfd2-4b25ec202381' },
      request,
      unstable_pattern: '/plans/:planId',
    });

    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      request,
      PlanDetailEnqueuePlanRunDocument,
      {
        input: {
          planId: '80864bba-630a-451d-bfd2-4b25ec202381',
          priority: 1,
          jobRunHooksJson: hooksPayload,
        },
      },
    );
  });

  test('passes parsed ralph tuning into enqueuePlanRun when ralphTuning JSON is valid', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue({
      enqueuePlanRun: {
        jobId: 'job-2',
        planId: '80864bba-630a-451d-bfd2-4b25ec202381',
      },
    });

    const ralphPayload = {
      iterations: 3,
      project: 'applications/openthrottle-server',
    };

    const formData = new FormData();
    formData.set('intent', 'runPlan');
    formData.set('ralphTuning', JSON.stringify(ralphPayload));

    const request = new Request(
      'http://localhost/plans/80864bba-630a-451d-bfd2-4b25ec202381',
      {
        body: formData,
        method: 'POST',
      },
    );

    await action({
      context: {},
      params: { planId: '80864bba-630a-451d-bfd2-4b25ec202381' },
      request,
      unstable_pattern: '/plans/:planId',
    });

    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      request,
      PlanDetailEnqueuePlanRunDocument,
      {
        input: {
          planId: '80864bba-630a-451d-bfd2-4b25ec202381',
          priority: 1,
          ralph: ralphPayload,
        },
      },
    );
  });

  test('returns error when ralphTuning JSON is invalid', async () => {
    const formData = new FormData();
    formData.set('intent', 'runPlan');
    formData.set('ralphTuning', 'not-json');

    const request = new Request(
      'http://localhost/plans/80864bba-630a-451d-bfd2-4b25ec202381',
      {
        body: formData,
        method: 'POST',
      },
    );

    const result = await action({
      context: {},
      params: { planId: '80864bba-630a-451d-bfd2-4b25ec202381' },
      request,
      unstable_pattern: '/plans/:planId',
    });

    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    expect(result).toEqual({
      runPlanError: 'Invalid workflow run options payload.',
    });
  });
});

describe('routes/plans.$planId._index action (cancelPlanRun)', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  test('calls cancelPlanRun with plan id', async () => {
    const cancelPayload: PlanDetailCancelPlanRunMutation['cancelPlanRun'] = {
      __typename: 'CancelPlanRunResultObject',
      activeJobIdsCouldNotCancel: [],
      noMatchingJob: false,
      planId: '80864bba-630a-451d-bfd2-4b25ec202381',
      planStatusAfter: 'PENDING',
      removedJobIds: ['job-1'],
      signaledActiveRunToStop: false,
    };

    mockExecuteGraphqlWithAuth.mockResolvedValue({
      cancelPlanRun: cancelPayload,
    });

    const formData = new FormData();
    formData.set('intent', 'cancelPlanRun');

    const request = new Request(
      'http://localhost/plans/80864bba-630a-451d-bfd2-4b25ec202381',
      {
        body: formData,
        method: 'POST',
      },
    );

    const result = await action({
      context: {},
      params: { planId: '80864bba-630a-451d-bfd2-4b25ec202381' },
      request,
      unstable_pattern: '/plans/:planId',
    });

    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      request,
      PlanDetailCancelPlanRunDocument,
      {
        input: { planId: '80864bba-630a-451d-bfd2-4b25ec202381' },
      },
    );
    expect(result).toEqual({ cancelPlanRun: cancelPayload });
  });

  test('returns cancelPlanRunError when GraphQL throws', async () => {
    mockExecuteGraphqlWithAuth.mockRejectedValue(new Error('network down'));

    const formData = new FormData();
    formData.set('intent', 'cancelPlanRun');

    const request = new Request(
      'http://localhost/plans/80864bba-630a-451d-bfd2-4b25ec202381',
      {
        body: formData,
        method: 'POST',
      },
    );

    const result = await action({
      context: {},
      params: { planId: '80864bba-630a-451d-bfd2-4b25ec202381' },
      request,
      unstable_pattern: '/plans/:planId',
    });

    expect(result).toEqual({ cancelPlanRunError: 'network down' });
  });

  test('returns cancelPlanRunError when cancelPlanRun is missing from response', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue({ cancelPlanRun: null });

    const formData = new FormData();
    formData.set('intent', 'cancelPlanRun');

    const request = new Request(
      'http://localhost/plans/80864bba-630a-451d-bfd2-4b25ec202381',
      {
        body: formData,
        method: 'POST',
      },
    );

    const result = await action({
      context: {},
      params: { planId: '80864bba-630a-451d-bfd2-4b25ec202381' },
      request,
      unstable_pattern: '/plans/:planId',
    });

    expect(result).toEqual({
      cancelPlanRunError: 'Failed to cancel plan run.',
    });
  });
});
