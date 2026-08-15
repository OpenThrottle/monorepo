// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/plans.$planId.tasks.$taskId._index';

// Keep the real `parseFormData`; only stub the network call. `importOriginal`
// is SSR-safe under node (the package's `window.env` read is `IS_BROWSER`-gated).
vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const {
  PlanDetailAddHookDocument,
  TaskDetailAddTaskTagDocument,
  TaskDetailRemoveTaskTagDocument,
} = await import('~/__generated__/graphql');
const { updateTaskTag, addTaskHook } = await import('../taskId');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const actionArgs = (): Route.ActionArgs => {
  const request = new Request('http://localhost/plans/plan-1/tasks/task-1', {
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: { planId: 'plan-1', taskId: 'task-1' },
    pattern: '/plans/:planId/tasks/:taskId',
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

describe('plans/actions/taskId tag + hook parsers', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        addHook: { id: 'h1' },
      }),
    );
  });

  test('updateTaskTag(add) injects the route taskId and forwards the tag', async () => {
    const result = await updateTaskTag(
      actionArgs(),
      'task-1',
      form({ tag: '  ready  ' }),
      true,
    );

    expect(result).toEqual({ taskTagUpdated: true });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      TaskDetailAddTaskTagDocument,
      { input: { tag: 'ready', taskId: 'task-1' } },
    );
  });

  test('updateTaskTag(remove) targets the remove document', async () => {
    const result = await updateTaskTag(
      actionArgs(),
      'task-1',
      form({ tag: 'ready' }),
      false,
    );

    expect(result).toEqual({ taskTagUpdated: true });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      TaskDetailRemoveTaskTagDocument,
      { input: { tag: 'ready', taskId: 'task-1' } },
    );
  });

  test('updateTaskTag rejects a blank tag without calling the server', async () => {
    const result = await updateTaskTag(
      actionArgs(),
      'task-1',
      form({ tag: '   ' }),
      true,
    );

    expect(result).toEqual({ taskTagError: 'Tag is required.' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('addTaskHook injects the anchor task and plan ids from the route', async () => {
    const result = await addTaskHook(
      actionArgs(),
      'task-1',
      form({ role: 'after', source: 'skill' }),
    );

    expect(result).toEqual({ addHook: { id: 'h1' } });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      PlanDetailAddHookDocument,
      {
        input: {
          anchorTaskId: 'task-1',
          planId: 'plan-1',
          role: 'after',
          source: 'skill',
        },
      },
    );
  });
});
