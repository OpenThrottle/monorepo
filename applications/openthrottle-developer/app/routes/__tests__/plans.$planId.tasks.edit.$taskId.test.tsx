// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { action, loader } from '../plans.$planId.tasks.$taskId.edit';
import { createTestRouterContext } from '@openthrottle/react-router-testing';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

describe('routes/plans.$planId.tasks.$taskId.edit.tsx', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  describe('loader', () => {
    test('returns null task when taskId is missing', async () => {
      const result = await loader({
        context: createTestRouterContext(),
        params: { planId: 'plan-1', taskId: '' },
        pattern: '/plans/:planId/tasks/:taskId/edit',
        request: new Request('http://localhost/plans/plan-1/tasks//edit'),
        url: new URL('http://localhost/plans/plan-1/tasks//edit'),
      });

      expect(result).toEqual({ task: null });
      expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    });

    test('loads task by id', async () => {
      const mockTask = {
        __typename: 'TaskObject' as const,
        id: 'task-1',
        planId: 'plan-1',
        title: 'Test Task',
      };

      mockExecuteGraphqlWithAuth.mockResolvedValue({ task: mockTask });

      const result = await loader({
        context: createTestRouterContext(),
        params: { planId: 'plan-1', taskId: 'task-1' },
        pattern: '/plans/:planId/tasks/:taskId/edit',
        request: new Request('http://localhost/plans/plan-1/tasks/task-1/edit'),
        url: new URL('http://localhost/plans/plan-1/tasks/task-1/edit'),
      });

      expect(result).toEqual({ task: mockTask });
    });
  });

  describe('action', () => {
    test('returns error when task id does not match route', async () => {
      const formData = new FormData();
      formData.set('id', 'other-task');
      formData.set('title', 'Updated task');

      const request = new Request(
        'http://localhost/plans/plan-1/tasks/task-1/edit',
        {
          body: formData,
          method: 'POST',
        },
      );

      const result = await action({
        context: createTestRouterContext(),
        params: { planId: 'plan-1', taskId: 'task-1' },
        pattern: '/plans/:planId/tasks/:taskId/edit',
        request,
        url: new URL(request.url),
      });

      expect(result).toEqual({ error: 'Task id does not match.' });
      expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    });

    test('updates task and redirects', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        updateTask: { id: 'task-1', planId: 'plan-1' },
      });

      const formData = new FormData();
      formData.set('id', 'task-1');
      formData.set('title', 'Updated task');

      const request = new Request(
        'http://localhost/plans/plan-1/tasks/task-1/edit',
        {
          body: formData,
          method: 'POST',
        },
      );

      const result = await action({
        context: createTestRouterContext(),
        params: { planId: 'plan-1', taskId: 'task-1' },
        pattern: '/plans/:planId/tasks/:taskId/edit',
        request,
        url: new URL(request.url),
      });

      expect((result as Response).status).toBe(302);
    });
  });
});
