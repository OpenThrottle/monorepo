// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/plans.$planId._index';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { GraphqlResponseError, executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { PlanDetailEnqueuePlanRunDocument, PlanDetailSchedulePlanRunDocument } =
  await import('~/__generated__/graphql');
const { PLAN_SCHEDULE_CONFIRM_COPY } =
  await import('~/routing/plans/data/data.copy');
const { runPlan, schedulePlanRun } = await import('../planId');

const mockExecute = vi.mocked(executeGraphqlWithAuth);
const SCHEDULED_FOR = '2026-11-08T17:00:00.000Z';
const FIRE_AT = '2026-12-01T09:00:00.000Z';

const actionArgs = (): Route.ActionArgs => {
  const request = new Request('http://localhost/plans/plan-1', {
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: { planId: 'plan-1' },
    pattern: '/plans/:planId',
    request,
    url: new URL(request.url),
  };
};

const form = (entries: Record<string, string>): FormData => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
};

const rejectWith = (code: string): void => {
  mockExecute.mockRejectedValue(
    new GraphqlResponseError('GraphQL errors: conflict', {
      code,
      planRunId: 'run-1',
      scheduledFor: SCHEDULED_FOR,
    }),
  );
};

describe('plan detail run-now conflicts', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('runPlan forwards cancelScheduled only when the form says true', async () => {
    mockExecute.mockResolvedValue({ enqueuePlanRun: { id: 'run-1' } });

    await runPlan(
      actionArgs(),
      'plan-1',
      form({ branch: 'main', cancelScheduled: 'true' }),
    );
    await runPlan(actionArgs(), 'plan-1', form({ branch: 'main' }));

    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      expect.any(Request),
      PlanDetailEnqueuePlanRunDocument,
      {
        input: {
          branch: 'main',
          cancelScheduled: true,
          planId: 'plan-1',
          priority: 1,
        },
      },
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      2,
      expect.any(Request),
      PlanDetailEnqueuePlanRunDocument,
      { input: { branch: 'main', planId: 'plan-1', priority: 1 } },
    );
  });

  test('PLAN_ALREADY_SCHEDULED becomes a conflict, not an error toast', async () => {
    rejectWith('PLAN_ALREADY_SCHEDULED');

    const result = await runPlan(
      actionArgs(),
      'plan-1',
      form({ branch: 'main' }),
    );

    expect(result).toEqual({
      runPlanConflict: {
        code: 'PLAN_ALREADY_SCHEDULED',
        planRunId: 'run-1',
        scheduledFor: SCHEDULED_FOR,
      },
    });
  });

  test('PLAN_ACTIVE becomes a clear error message', async () => {
    rejectWith('PLAN_ACTIVE');

    const result = await runPlan(
      actionArgs(),
      'plan-1',
      form({ branch: 'main' }),
    );

    expect(result).toEqual({
      runPlanError: PLAN_SCHEDULE_CONFIRM_COPY.conflictActive,
    });
  });

  test('any other failure keeps its own message', async () => {
    mockExecute.mockRejectedValue(new Error('redis is down'));

    const result = await runPlan(
      actionArgs(),
      'plan-1',
      form({ branch: 'main' }),
    );

    expect(result).toEqual({ runPlanError: 'redis is down' });
  });
});

describe('plan detail schedule conflicts', () => {
  const scheduleForm = (extra: Record<string, string> = {}): FormData => {
    return form({ branch: 'main', scheduledFor: FIRE_AT, ...extra });
  };

  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('schedulePlanRun forwards replaceScheduled only when the form says true', async () => {
    mockExecute.mockResolvedValue({ schedulePlanRun: { id: 'run-2' } });

    await schedulePlanRun(
      actionArgs(),
      'plan-1',
      scheduleForm({ replaceScheduled: 'true' }),
    );
    await schedulePlanRun(actionArgs(), 'plan-1', scheduleForm());

    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      expect.any(Request),
      PlanDetailSchedulePlanRunDocument,
      {
        input: expect.objectContaining({
          planId: 'plan-1',
          replaceScheduled: true,
        }),
      },
    );
    const secondInput = mockExecute.mock.calls[1]?.[2];
    expect(secondInput).not.toHaveProperty('input.replaceScheduled');
  });

  test('PLAN_ALREADY_SCHEDULED becomes a conflict for the replace confirm', async () => {
    rejectWith('PLAN_ALREADY_SCHEDULED');

    const result = await schedulePlanRun(
      actionArgs(),
      'plan-1',
      scheduleForm(),
    );

    expect(result).toEqual({
      schedulePlanRunConflict: {
        code: 'PLAN_ALREADY_SCHEDULED',
        planRunId: 'run-1',
        scheduledFor: SCHEDULED_FOR,
      },
    });
  });

  test('PLAN_NOT_SCHEDULABLE becomes a clear error message', async () => {
    rejectWith('PLAN_NOT_SCHEDULABLE');

    const result = await schedulePlanRun(
      actionArgs(),
      'plan-1',
      scheduleForm(),
    );

    expect(result).toEqual({
      schedulePlanRunError: PLAN_SCHEDULE_CONFIRM_COPY.conflictNotSchedulable,
    });
  });
});
