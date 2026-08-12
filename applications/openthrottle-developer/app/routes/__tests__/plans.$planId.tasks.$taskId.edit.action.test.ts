// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/plans.$planId.tasks.$taskId.edit';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { action } = await import('../plans.$planId.tasks.$taskId.edit');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

/** Narrows an action result to a `Response`, failing the test otherwise. */
function assertResponse(value: unknown): asserts value is Response {
  expect(value).toBeInstanceOf(Response);
}

const buildArgs = (params: {
  formData: Record<string, string>;
  planId: string;
  taskId: string;
}): Route.ActionArgs => {
  const body = new URLSearchParams(params.formData);
  const request = new Request(
    'http://localhost/plans/plan-1/tasks/task-1/edit',
    {
      body,
      method: 'POST',
    },
  );
  return {
    context: createTestRouterContext(),
    params: { planId: params.planId, taskId: params.taskId },
    pattern: '/plans/:planId/tasks/:taskId/edit',
    request,
    url: new URL(request.url),
  };
};

describe('routes/plans.$planId.tasks.$taskId.edit action', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('errors when taskId route param is missing', async () => {
    const result = await action(
      buildArgs({
        formData: { id: 'task-1', title: 'Title' },
        planId: 'plan-1',
        taskId: '',
      }),
    );

    expect(mockExecute).not.toHaveBeenCalled();
    expect(result).toEqual({ error: 'Task id is required.' });
  });

  test('errors when the form id does not match the route taskId', async () => {
    const result = await action(
      buildArgs({
        formData: { id: 'other-task', title: 'Title' },
        planId: 'plan-1',
        taskId: 'task-1',
      }),
    );

    expect(result).toEqual({ error: 'Task id does not match.' });
  });

  test('errors when the title is blank', async () => {
    const result = await action(
      buildArgs({
        formData: { id: 'task-1', title: '   ' },
        planId: 'plan-1',
        taskId: 'task-1',
      }),
    );

    expect(result).toEqual({ error: 'Title is required.' });
  });

  test('updates the task and redirects on success', async () => {
    mockExecute.mockResolvedValue({
      updateTask: {
        assignee: null,
        category: null,
        createdAt: '2026-07-24T00:00:00.000Z',
        description: null,
        id: 'task-1',
        planId: 'plan-1',
        status: 'PENDING',
        summary: null,
        title: 'Updated title',
        updatedAt: '2026-07-24T00:00:00.000Z',
      },
    });

    const result = await action(
      buildArgs({
        formData: { id: 'task-1', title: '  Updated title  ' },
        planId: 'plan-1',
        taskId: 'task-1',
      }),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { input: { id: 'task-1', title: 'Updated title' } },
    );
    assertResponse(result);
    expect(result.status).toBe(302);
    expect(result.headers.get('Location')).toBe('/plans/plan-1/tasks/task-1');
  });

  test('returns an error when the mutation reports no updated task', async () => {
    mockExecute.mockResolvedValue({ updateTask: null });

    const result = await action(
      buildArgs({
        formData: { id: 'task-1', title: 'Title' },
        planId: 'plan-1',
        taskId: 'task-1',
      }),
    );

    expect(result).toEqual({ error: 'Failed to update task.' });
  });

  test('returns the error message when the mutation throws', async () => {
    mockExecute.mockRejectedValue(new Error('GraphQL boom'));

    const result = await action(
      buildArgs({
        formData: { id: 'task-1', title: 'Title' },
        planId: 'plan-1',
        taskId: 'task-1',
      }),
    );

    expect(result).toEqual({ error: 'GraphQL boom' });
  });
});
