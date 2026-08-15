// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/queues.$queueId._index';

// Keep the real `parseFormData`/`coerceBoolean`; only stub the network call.
vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { QueueDetailCleanQueueDocument } =
  await import('~/__generated__/graphql');
const { runQueueDetailAction } = await import('../queueId');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const actionArgs = (formData: FormData): Route.ActionArgs => {
  const request = new Request('http://localhost/queues/plans', {
    body: formData,
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: { queueId: 'plans' },
    pattern: '/queues/:queueId',
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

describe('routing/queues/actions/queueId cleanQueue intent', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('sends the coerced confirm boolean and forwards the state', async () => {
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        cleanQueue: { queueName: 'plans', removedCount: 3, success: true },
      }),
    );

    const result = await runQueueDetailAction(
      actionArgs(
        form({ confirm: 'true', intent: 'cleanQueue', state: 'completed' }),
      ),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      QueueDetailCleanQueueDocument,
      {
        input: { confirm: true, queueName: 'plans', state: 'completed' },
      },
    );
    expect(result).toEqual({
      cleaned: { queueName: 'plans', removedCount: 3 },
    });
  });

  test('defaults confirm to false when the form omits it', async () => {
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        cleanQueue: { queueName: 'plans', removedCount: 0, success: true },
      }),
    );

    await runQueueDetailAction(
      actionArgs(form({ intent: 'cleanQueue', state: 'failed' })),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      QueueDetailCleanQueueDocument,
      {
        input: { confirm: false, queueName: 'plans', state: 'failed' },
      },
    );
  });

  test('rejects a blank state without calling the mutation', async () => {
    const result = await runQueueDetailAction(
      actionArgs(form({ confirm: 'true', intent: 'cleanQueue', state: '' })),
    );

    expect(mockExecute).not.toHaveBeenCalled();
    expect(result).toHaveProperty('error');
  });
});
