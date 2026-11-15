// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/schedule.create';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { CreateScheduledAgentJobDocument } =
  await import('~/__generated__/graphql');
const { action } = await import('../schedule.create');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const actionArgs = (entries: Record<string, string>): Route.ActionArgs => {
  const body = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    body.set(key, value);
  }
  const request = new Request('http://localhost/schedule/create', {
    body,
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/schedule/create',
    request,
    url: new URL(request.url),
  };
};

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const valid = {
  cronPattern: '0 3 * * *',
  driverId: 'claude-code',
  name: 'Nightly audit',
  prompt: 'Audit dependencies',
  scheduleKind: 'cron',
};

describe('routes/schedule.create action', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('creates the job and redirects for a valid payload', async () => {
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        createScheduledAgentJob: { id: 'job-1' },
      }),
    );

    const result = await action(
      actionArgs({
        ...valid,
        enabled: 'true',
        misfireThresholdMinutes: '5',
        repositoryCheckoutId: '__none__',
        timeoutMs: '60000',
      }),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      CreateScheduledAgentJobDocument,
      {
        input: expect.objectContaining({
          cronPattern: '0 3 * * *',
          driverId: 'claude-code',
          enabled: true,
          misfireThresholdMs: 300_000,
          name: 'Nightly audit',
          prompt: 'Audit dependencies',
          timeoutMs: 60_000,
        }),
      },
    );
    expect(result).toBeInstanceOf(Response);
    expect(result instanceof Response && result.headers.get('Location')).toBe(
      '/schedule/job-1',
    );
  });

  test.each([
    ['missing name', { ...valid, name: '' }],
    ['missing prompt', { ...valid, prompt: '' }],
    ['missing driver', { ...valid, driverId: '' }],
  ])('returns a structured error for %s', async (_label, entries) => {
    const result = await action(actionArgs(entries));

    expect(result).toEqual({ error: expect.any(String) });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('returns the timing error when the cron pattern is missing', async () => {
    const { cronPattern: _cron, ...rest } = valid;

    const result = await action(actionArgs(rest));

    expect(result).toEqual({ error: expect.any(String) });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('surfaces a thrown mutation error', async () => {
    mockExecute.mockRejectedValue(new Error('server said no'));

    const result = await action(actionArgs(valid));

    expect(result).toEqual({ error: 'server said no' });
  });
});
