// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { action, loader } from '../plans.$planId.tasks.create';
import { createTestRouterContext } from '~/testing/router-context';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

describe('routes/plans.$planId.tasks.create.tsx', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  describe('loader', () => {
    test('redirects to /plans when planId is missing', async () => {
      const result = await loader({
        context: createTestRouterContext(),
        params: { planId: '' },
        pattern: '/plans/:planId/tasks/create',
        request: new Request('http://localhost/plans//tasks/create'),
        url: new URL('http://localhost/plans//tasks/create'),
      });

      expect((result as Response).status).toBe(302);
      expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    });

    test('loads plan for task creation', async () => {
      const mockPlan = {
        __typename: 'PlanObject' as const,
        id: 'plan-1',
        title: 'Test Plan',
      };

      mockExecuteGraphqlWithAuth.mockResolvedValue({ plan: mockPlan });

      const result = await loader({
        context: createTestRouterContext(),
        params: { planId: 'plan-1' },
        pattern: '/plans/:planId/tasks/create',
        request: new Request('http://localhost/plans/plan-1/tasks/create'),
        url: new URL('http://localhost/plans/plan-1/tasks/create'),
      });

      expect(result).toEqual({ plan: mockPlan, planId: 'plan-1' });
    });
  });

  describe('action', () => {
    test('returns error when title is missing', async () => {
      const formData = new FormData();
      formData.set('planId', 'plan-1');

      const request = new Request(
        'http://localhost/plans/plan-1/tasks/create',
        {
          body: formData,
          method: 'POST',
        },
      );

      const result = await action({
        context: createTestRouterContext(),
        params: { planId: 'plan-1' },
        pattern: '/plans/:planId/tasks/create',
        request,
        url: new URL(request.url),
      });

      expect(result).toEqual({ error: 'Title is required.' });
      expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    });

    test('creates task and redirects', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        createTask: { id: 'task-new' },
      });

      const formData = new FormData();
      formData.set('planId', 'plan-1');
      formData.set('title', 'New task');

      const request = new Request(
        'http://localhost/plans/plan-1/tasks/create',
        {
          body: formData,
          method: 'POST',
        },
      );

      const result = await action({
        context: createTestRouterContext(),
        params: { planId: 'plan-1' },
        pattern: '/plans/:planId/tasks/create',
        request,
        url: new URL(request.url),
      });

      expect((result as Response).status).toBe(302);
    });
  });
});
