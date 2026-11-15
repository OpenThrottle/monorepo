// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/queues._index';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { QueuesPauseQueueDocument, QueuesResumeQueueDocument } =
  await import('~/__generated__/graphql');
const { action } = await import('../queues._index');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const actionArgs = (entries: Record<string, string>): Route.ActionArgs => {
  const body = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    body.set(key, value);
  }
  const request = new Request('http://localhost/queues', {
    body,
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/queues',
    request,
    url: new URL(request.url),
  };
};

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

describe('routes/queues._index action', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('pauses a queue for a valid payload', async () => {
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        pauseQueue: { queueName: 'plans', success: true },
      }),
    );

    const result = await action(
      actionArgs({ intent: 'pauseQueue', queueName: 'plans' }),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      QueuesPauseQueueDocument,
      { input: { queueName: 'plans' } },
    );
    expect(result).toEqual({ paused: 'plans' });
  });

  test('resumes a queue for a valid payload', async () => {
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        resumeQueue: { queueName: 'plans', success: true },
      }),
    );

    const result = await action(
      actionArgs({ intent: 'resumeQueue', queueName: 'plans' }),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      QueuesResumeQueueDocument,
      { input: { queueName: 'plans' } },
    );
    expect(result).toEqual({ resumed: 'plans' });
  });

  test.each([
    ['missing queue name', { intent: 'pauseQueue' }],
    ['blank queue name', { intent: 'pauseQueue', queueName: '   ' }],
    ['missing intent', { queueName: 'plans' }],
    ['unknown intent', { intent: 'dropQueue', queueName: 'plans' }],
  ])('returns a structured error for %s', async (_label, entries) => {
    const result = await action(actionArgs(entries));

    expect(result).toEqual({ error: expect.any(String) });
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
