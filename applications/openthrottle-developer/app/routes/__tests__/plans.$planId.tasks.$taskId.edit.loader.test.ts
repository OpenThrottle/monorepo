// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { GetTaskByIdQuery } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/plans.$planId.tasks.$taskId.edit';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { loader } = await import('../plans.$planId.tasks.$taskId.edit');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

/** Narrows a loader result to a `Response`, failing the test otherwise. */
function assertResponse(value: unknown): asserts value is Response {
  expect(value).toBeInstanceOf(Response);
}

const buildArgs = (params: {
  planId: string;
  taskId: string;
}): Route.LoaderArgs => {
  const request = new Request(
    'http://localhost/plans/plan-1/tasks/task-1/edit',
  );
  return {
    context: createTestRouterContext(),
    params: { planId: params.planId, taskId: params.taskId },
    pattern: '/plans/:planId/tasks/:taskId/edit',
    request,
    url: new URL(request.url),
  };
};

const buildTask = (
  overrides: Partial<NonNullable<GetTaskByIdQuery['task']>> = {},
): NonNullable<GetTaskByIdQuery['task']> => ({
  afterHooks: [],
  assignee: null,
  beforeHooks: [],
  category: null,
  createdAt: '2026-07-24T00:00:00.000Z',
  description: null,
  hookRole: null,
  id: 'task-1',
  planId: 'plan-1',
  projectRelation: null,
  requirementsJson: '[]',
  sortOrder: 0,
  status: 'PENDING',
  summary: null,
  tags: [],
  title: 'Original title',
  updatedAt: '2026-07-24T00:00:00.000Z',
  ...overrides,
});

describe('routes/plans.$planId.tasks.$taskId.edit loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('returns null task without calling GraphQL when taskId is missing', async () => {
    const result = await loader(buildArgs({ planId: 'plan-1', taskId: '' }));

    expect(mockExecute).not.toHaveBeenCalled();
    expect(result).toEqual({ task: null });
  });

  test('returns the fetched task when the plan ids match', async () => {
    const task = buildTask();
    mockExecute.mockResolvedValue({
      skillTagVocabulary: { tags: [], totalCount: 0 },
      task,
    });

    const result = await loader(
      buildArgs({ planId: 'plan-1', taskId: 'task-1' }),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { id: 'task-1' },
    );
    expect(result).toEqual({ task });
  });

  test('redirects when the route planId does not match the task planId', async () => {
    const task = buildTask({ planId: 'other-plan' });
    mockExecute.mockResolvedValue({
      skillTagVocabulary: { tags: [], totalCount: 0 },
      task,
    });

    const result = await loader(
      buildArgs({ planId: 'plan-1', taskId: 'task-1' }),
    );

    assertResponse(result);
    expect(result.status).toBe(302);
    expect(result.headers.get('Location')).toBe(
      '/plans/other-plan/tasks/task-1/edit',
    );
  });

  test('returns a null task when the task is not found', async () => {
    mockExecute.mockResolvedValue({
      skillTagVocabulary: { tags: [], totalCount: 0 },
      task: null,
    });

    const result = await loader(
      buildArgs({ planId: 'plan-1', taskId: 'task-1' }),
    );

    expect(result).toEqual({ task: null });
  });
});
