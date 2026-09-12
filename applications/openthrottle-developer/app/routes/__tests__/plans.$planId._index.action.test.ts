import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  PlanDetailCancelPlanRunDocument,
  type PlanDetailCancelPlanRunMutation,
  PlanDetailEnqueuePlanRunDocument,
  PlanDetailForceSettlePlanRunDocument,
  type PlanDetailForceSettlePlanRunMutation,
  PlanDetailUpdatePlanRunConfigDocument,
} from '~/__generated__/graphql';

import { action } from '../plans.$planId._index';

// Keep the real `parseFormData`; only stub the network call.
vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

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
    formData.set('branch', 'feature/test');
    formData.set('ralphTuning', '');

    const request = new Request(
      'http://localhost/plans/80864bba-630a-451d-bfd2-4b25ec202381',
      {
        body: formData,
        method: 'POST',
      },
    );

    await action({
      context: createTestRouterContext(),
      params: { planId: '80864bba-630a-451d-bfd2-4b25ec202381' },
      pattern: '/plans/:planId',
      request,
      url: new URL(request.url),
    });

    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      request,
      PlanDetailEnqueuePlanRunDocument,
      {
        input: {
          branch: 'feature/test',
          planId: '80864bba-630a-451d-bfd2-4b25ec202381',
          priority: 1,
        },
      },
    );
  });

  test('returns a runPlanError and never enqueues when branch is missing', async () => {
    const formData = new FormData();
    formData.set('intent', 'runPlan');
    // No branch field: branch is a required kickoff input, so the action must
    // fail loud and never reach the enqueue mutation.

    const request = new Request(
      'http://localhost/plans/80864bba-630a-451d-bfd2-4b25ec202381',
      {
        body: formData,
        method: 'POST',
      },
    );

    const result = await action({
      context: createTestRouterContext(),
      params: { planId: '80864bba-630a-451d-bfd2-4b25ec202381' },
      pattern: '/plans/:planId',
      request,
      url: new URL(request.url),
    });

    expect(result).toMatchObject({
      runPlanError: expect.stringContaining('branch'),
    });
    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
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
    formData.set('branch', 'feature/test');
    formData.set('jobRunHooksJson', hooksPayload);

    const request = new Request(
      'http://localhost/plans/80864bba-630a-451d-bfd2-4b25ec202381',
      {
        body: formData,
        method: 'POST',
      },
    );

    await action({
      context: createTestRouterContext(),
      params: { planId: '80864bba-630a-451d-bfd2-4b25ec202381' },
      pattern: '/plans/:planId',
      request,
      url: new URL(request.url),
    });

    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      request,
      PlanDetailEnqueuePlanRunDocument,
      {
        input: {
          branch: 'feature/test',
          jobRunHooksJson: hooksPayload,
          planId: '80864bba-630a-451d-bfd2-4b25ec202381',
          priority: 1,
        },
      },
    );
  });

  test('passes workingDirectory into enqueuePlanRun when form field is set', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue({
      enqueuePlanRun: {
        jobId: 'job-wd',
        planId: '80864bba-630a-451d-bfd2-4b25ec202381',
      },
    });

    const workspacePath = '/Users/matt/Development/openthrottle';

    const formData = new FormData();
    formData.set('intent', 'runPlan');
    formData.set('branch', 'feature/test');
    formData.set('workingDirectory', workspacePath);

    const request = new Request(
      'http://localhost/plans/80864bba-630a-451d-bfd2-4b25ec202381',
      {
        body: formData,
        method: 'POST',
      },
    );

    await action({
      context: createTestRouterContext(),
      params: { planId: '80864bba-630a-451d-bfd2-4b25ec202381' },
      pattern: '/plans/:planId',
      request,
      url: new URL(request.url),
    });

    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      request,
      PlanDetailEnqueuePlanRunDocument,
      {
        input: {
          branch: 'feature/test',
          planId: '80864bba-630a-451d-bfd2-4b25ec202381',
          priority: 1,
          workingDirectory: workspacePath,
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
    formData.set('branch', 'feature/test');
    formData.set('ralphTuning', JSON.stringify(ralphPayload));

    const request = new Request(
      'http://localhost/plans/80864bba-630a-451d-bfd2-4b25ec202381',
      {
        body: formData,
        method: 'POST',
      },
    );

    await action({
      context: createTestRouterContext(),
      params: { planId: '80864bba-630a-451d-bfd2-4b25ec202381' },
      pattern: '/plans/:planId',
      request,
      url: new URL(request.url),
    });

    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      request,
      PlanDetailEnqueuePlanRunDocument,
      {
        input: {
          branch: 'feature/test',
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
    formData.set('branch', 'feature/test');
    formData.set('ralphTuning', 'not-json');

    const request = new Request(
      'http://localhost/plans/80864bba-630a-451d-bfd2-4b25ec202381',
      {
        body: formData,
        method: 'POST',
      },
    );

    const result = await action({
      context: createTestRouterContext(),
      params: { planId: '80864bba-630a-451d-bfd2-4b25ec202381' },
      pattern: '/plans/:planId',
      request,
      url: new URL(request.url),
    });

    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    expect(result).toEqual({
      runPlanError: 'Invalid workflow run options payload.',
    });
  });
});

describe('routes/plans.$planId._index action (saveRunConfig)', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  test('persists runConfigJson via updatePlan', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue({
      updatePlan: {
        id: '80864bba-630a-451d-bfd2-4b25ec202381',
        runConfigJson: '{"version":1}',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    });

    const configPayload = JSON.stringify({
      ralph: {
        debugCli: 'omit',
        executionBackend: 'claude',
        iterationTimeoutText: '',
        iterations: 4,
        model: 'auto',
        project: '',
        prompt: '/agents/ralph',
        promptFile: '',
        promptLayer: 'named',
        skipWorktreeSetup: false,
        worktreeBase: '',
        worktreeCli: 'omit',
        worktreeName: '',
      },
      target: { mode: 'plan', taskId: '' },
      version: 1,
      workspace: { workingDirectory: '' },
    });

    const formData = new FormData();
    formData.set('intent', 'saveRunConfig');
    formData.set('runConfigJson', configPayload);

    const request = new Request(
      'http://localhost/plans/80864bba-630a-451d-bfd2-4b25ec202381',
      {
        body: formData,
        method: 'POST',
      },
    );

    const result = await action({
      context: createTestRouterContext(),
      params: { planId: '80864bba-630a-451d-bfd2-4b25ec202381' },
      pattern: '/plans/:planId',
      request,
      url: new URL(request.url),
    });

    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      request,
      PlanDetailUpdatePlanRunConfigDocument,
      {
        input: {
          id: '80864bba-630a-451d-bfd2-4b25ec202381',
          runConfigJson: configPayload,
        },
      },
    );
    expect(result).toEqual({
      saveRunConfig: {
        id: '80864bba-630a-451d-bfd2-4b25ec202381',
        runConfigJson: '{"version":1}',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    });
  });

  test('returns error when runConfigJson is not valid JSON', async () => {
    const formData = new FormData();
    formData.set('intent', 'saveRunConfig');
    formData.set('runConfigJson', 'not-json');

    const request = new Request(
      'http://localhost/plans/80864bba-630a-451d-bfd2-4b25ec202381',
      {
        body: formData,
        method: 'POST',
      },
    );

    const result = await action({
      context: createTestRouterContext(),
      params: { planId: '80864bba-630a-451d-bfd2-4b25ec202381' },
      pattern: '/plans/:planId',
      request,
      url: new URL(request.url),
    });

    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    expect(result).toEqual({
      saveRunConfigError: 'runConfigJson must be valid JSON.',
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
      cancelRequested: false,
      noMatchingJob: false,
      outcome: 'RUN_CANCELLED',
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
      context: createTestRouterContext(),
      params: { planId: '80864bba-630a-451d-bfd2-4b25ec202381' },
      pattern: '/plans/:planId',
      request,
      url: new URL(request.url),
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
      context: createTestRouterContext(),
      params: { planId: '80864bba-630a-451d-bfd2-4b25ec202381' },
      pattern: '/plans/:planId',
      request,
      url: new URL(request.url),
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
      context: createTestRouterContext(),
      params: { planId: '80864bba-630a-451d-bfd2-4b25ec202381' },
      pattern: '/plans/:planId',
      request,
      url: new URL(request.url),
    });

    expect(result).toEqual({
      cancelPlanRunError: 'Failed to cancel plan run.',
    });
  });
});

describe('routes/plans.$planId._index action (forceSettlePlanRun)', () => {
  const planId = '80864bba-630a-451d-bfd2-4b25ec202381';
  const planRunId = 'c1b3a2d4-0000-4000-8000-000000000001';

  const post = async (formData: FormData) => {
    const request = new Request(`http://localhost/plans/${planId}`, {
      body: formData,
      method: 'POST',
    });
    const result = await action({
      context: createTestRouterContext(),
      params: { planId },
      pattern: '/plans/:planId',
      request,
      url: new URL(request.url),
    });
    return { request, result };
  };

  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  test('calls forceSettlePlanRun with the submitted planRunId, not the plan id', async () => {
    const settled: PlanDetailForceSettlePlanRunMutation['forceSettlePlanRun'] =
      {
        __typename: 'PlanRunObject',
        heartbeatExpected: false,
        id: planRunId,
        isStale: false,
        status: 'STALE',
      };
    mockExecuteGraphqlWithAuth.mockResolvedValue({
      forceSettlePlanRun: settled,
    });

    const formData = new FormData();
    formData.set('intent', 'forceSettlePlanRun');
    formData.set('planRunId', planRunId);

    const { request, result } = await post(formData);

    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      request,
      PlanDetailForceSettlePlanRunDocument,
      { input: { planRunId } },
    );
    expect(result).toEqual({ forceSettlePlanRun: settled });
  });

  test('returns forceSettlePlanRunError without calling GraphQL when planRunId is missing', async () => {
    const formData = new FormData();
    formData.set('intent', 'forceSettlePlanRun');

    const { result } = await post(formData);

    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    expect(result).toHaveProperty('forceSettlePlanRunError');
  });

  test('returns forceSettlePlanRunError when GraphQL throws', async () => {
    mockExecuteGraphqlWithAuth.mockRejectedValue(new Error('network down'));

    const formData = new FormData();
    formData.set('intent', 'forceSettlePlanRun');
    formData.set('planRunId', planRunId);

    const { result } = await post(formData);

    expect(result).toEqual({ forceSettlePlanRunError: 'network down' });
  });

  test('returns forceSettlePlanRunError when the run did not match the guard (null response)', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue({ forceSettlePlanRun: null });

    const formData = new FormData();
    formData.set('intent', 'forceSettlePlanRun');
    formData.set('planRunId', planRunId);

    const { result } = await post(formData);

    expect(result).toEqual({
      forceSettlePlanRunError:
        'Nothing to settle — this run is no longer an unsettled interactive run.',
    });
  });
});
