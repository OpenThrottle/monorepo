// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/schedule.$jobId.edit';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { UpdateScheduledAgentJobDocument } =
  await import('~/__generated__/graphql');
const { SCHEDULE_REPOSITORY_NONE_VALUE } =
  await import('~/routing/schedule/data/data.repositories');
const { action } = await import('../schedule.$jobId.edit');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const actionArgs = (entries: Record<string, string>): Route.ActionArgs => {
  const body = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    body.set(key, value);
  }
  const request = new Request('http://localhost/schedule/job-1/edit', {
    body,
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: { jobId: 'job-1' },
    pattern: '/schedule/:jobId/edit',
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

describe('routes/schedule.$jobId.edit action', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('updates the job and redirects for a valid payload', async () => {
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
        updateScheduledAgentJob: { id: 'job-1' },
      }),
    );

    const result = await action(
      actionArgs({
        ...valid,
        enabled: 'true',
        misfireThresholdMinutes: '5',
        repositoryCheckoutId: SCHEDULE_REPOSITORY_NONE_VALUE,
        timeoutMs: '60000',
      }),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      UpdateScheduledAgentJobDocument,
      {
        input: expect.objectContaining({
          cronPattern: '0 3 * * *',
          driverId: 'claude-code',
          id: 'job-1',
          misfireThresholdMs: 300_000,
          name: 'Nightly audit',
          prompt: 'Audit dependencies',
          repositoryCheckoutId: null,
          timeoutMs: 60_000,
        }),
      },
    );
    expect(mockExecute.mock.calls[0]?.[2]).not.toHaveProperty('input.enabled');
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
