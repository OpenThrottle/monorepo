// @vitest-environment node
import { createLoaderArgs } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/resources.resolve-id-ref';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { loader } = await import('../resources.resolve-id-ref');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const PLAN_ID = 'f5e40886-36d3-4886-9781-9722e0b9217b';
const TASK_ID = '2e139d89-3dde-42f1-a51a-6899ef4e1e86';

const loaderArgs = (search = ''): Route.LoaderArgs => {
  return createLoaderArgs<Route.LoaderArgs>({
    url: `http://localhost/resources/resolve-id-ref${search}`,
  });
};

describe('routes/resources.resolve-id-ref loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  describe('invalid input', () => {
    test('short-circuits an empty ref without calling GraphQL', async () => {
      const loaded = await loader(loaderArgs());

      expect(loaded).toEqual({ matches: [], ref: '' });
      expect(mockExecute).not.toHaveBeenCalled();
    });

    test('short-circuits a too-short ref without calling GraphQL', async () => {
      const loaded = await loader(loaderArgs('?ref=f5e'));

      expect(loaded).toEqual({ matches: [], ref: '' });
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  describe('valid input', () => {
    test('maps plan and task refs and echoes the normalized ref', async () => {
      mockExecute.mockResolvedValue({
        resolveIdRef: [
          {
            id: PLAN_ID,
            kind: 'PLAN',
            planId: null,
            planTitle: null,
            status: 'PENDING',
            title: 'Plan',
          },
          {
            id: TASK_ID,
            kind: 'TASK',
            planId: PLAN_ID,
            planTitle: 'Plan',
            status: 'COMPLETED',
            title: 'Task',
          },
        ],
      });

      const loaded = await loader(loaderArgs(`?ref=${PLAN_ID.toUpperCase()}`));

      const ref = PLAN_ID.replace(/-/g, '');
      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Request),
        expect.anything(),
        { ref },
      );
      expect(loaded).toEqual({
        matches: [
          { id: PLAN_ID, kind: 'PLAN', status: 'PENDING', title: 'Plan' },
          {
            id: TASK_ID,
            kind: 'TASK',
            planId: PLAN_ID,
            planTitle: 'Plan',
            status: 'COMPLETED',
            title: 'Task',
          },
        ],
        ref,
      });
    });

    test('drops a task ref that has no plan to link to', async () => {
      mockExecute.mockResolvedValue({
        resolveIdRef: [
          {
            id: TASK_ID,
            kind: 'TASK',
            planId: null,
            planTitle: null,
            status: 'PENDING',
            title: 'Orphan',
          },
        ],
      });

      const loaded = await loader(loaderArgs('?ref=2e139d89'));

      expect(loaded).toEqual({ matches: [], ref: '2e139d89' });
    });
  });

  describe('resolver failure', () => {
    test('degrades to an empty result when the resolver throws', async () => {
      mockExecute.mockRejectedValue(new Error('resolver down'));

      const loaded = await loader(loaderArgs('?ref=f5e40886'));

      expect(loaded).toEqual({ matches: [], ref: 'f5e40886' });
    });
  });
});
