// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/schedule.$jobId._index';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { action } = await import('../schedule.$jobId._index');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const JOB_ID = 'job-1';

const buildArgs = (formData: FormData): Route.ActionArgs => {
  const request = new Request(`http://localhost/schedule/${JOB_ID}`, {
    body: formData,
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: { jobId: JOB_ID },
    pattern: '/schedule/:jobId',
    request,
    url: new URL(request.url),
  };
};

const runNowFormData = (): FormData => {
  const formData = new FormData();
  formData.set('intent', 'run-now');
  return formData;
};

describe('routes/schedule.$jobId._index action', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('returns the id of the run it just enqueued', async () => {
    mockExecute.mockResolvedValueOnce({
      runScheduledAgentJobNow: { id: 'run-9' },
    });

    const result = await action(buildArgs(runNowFormData()));

    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      {
        id: JOB_ID,
      },
    );
    expect(result).toEqual({ ok: true, runId: 'run-9' });
  });

  test('returns the GraphQL error message when the run cannot be queued', async () => {
    mockExecute.mockRejectedValueOnce(new Error('queue is offline'));

    const result = await action(buildArgs(runNowFormData()));

    expect(result).toEqual({ error: 'queue is offline' });
  });

  test('toggle-enabled still returns the bare ok shape', async () => {
    mockExecute.mockResolvedValueOnce({
      setScheduledAgentJobEnabled: { id: JOB_ID },
    });

    const formData = new FormData();
    formData.set('intent', 'toggle-enabled');
    formData.set('enabled', 'false');

    const result = await action(buildArgs(formData));

    expect(result).toEqual({ ok: true });
  });
});
