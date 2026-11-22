// @vitest-environment node
import { createLoaderArgs } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/resources.project-plan-tasks';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { loader } = await import('../resources.project-plan-tasks');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const PLAN_ID = '01a20175-9298-7f05-98f8-2e3080c7fa7f';

const TASKS = [
  { id: 'task-1', sortOrder: 1000, status: 'COMPLETED', title: 'First' },
  { id: 'task-2', sortOrder: 2000, status: 'PENDING', title: 'Second' },
];

const loaderArgs = (search = ''): Route.LoaderArgs => {
  return createLoaderArgs<Route.LoaderArgs>({
    url: `http://localhost/resources/project-plan-tasks${search}`,
  });
};

describe('routes/resources.project-plan-tasks loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  describe('invalid planId', () => {
    test('answers 400 without calling GraphQL when planId is missing', async () => {
      const result = await loader(loaderArgs());

      expect(result.init?.status).toBe(400);
      expect(result.data).toEqual({
        kind: 'error',
        planId: '',
        reason: 'invalid-plan-id',
      });
      expect(mockExecute).not.toHaveBeenCalled();
    });

    test('answers 400 without calling GraphQL when planId is not a UUID', async () => {
      const result = await loader(loaderArgs('?planId=not-a-uuid'));

      expect(result.init?.status).toBe(400);
      expect(result.data).toMatchObject({ reason: 'invalid-plan-id' });
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  describe('valid planId', () => {
    test('returns the plan tasks from tasksByPlanId', async () => {
      mockExecute.mockResolvedValue({ tasksByPlanId: TASKS });

      const result = await loader(loaderArgs(`?planId=${PLAN_ID}`));

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Request),
        expect.anything(),
        { input: { planId: PLAN_ID } },
      );
      expect(result.init).toBeNull();
      expect(result.data).toEqual({
        kind: 'loaded',
        planId: PLAN_ID,
        tasks: TASKS,
      });
    });
  });

  describe('resolver failure', () => {
    test('returns an error result instead of throwing', async () => {
      mockExecute.mockRejectedValue(new Error('api down'));

      const result = await loader(loaderArgs(`?planId=${PLAN_ID}`));

      expect(result.init?.status).toBe(502);
      expect(result.data).toEqual({
        kind: 'error',
        planId: PLAN_ID,
        reason: 'request-failed',
      });
    });
  });
});
