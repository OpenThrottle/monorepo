import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { loader } from '../queues.$queueId.$jobId';
import type { Route } from '@/app/routes/+types/queues.$queueId.$jobId';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const mockJob = {
  data: '{"planId":"p1"}',
  failedReason: null,
  finishedOn: null,
  id: 'job-1',
  name: 'run-plan',
  processedOn: null,
  progress: null,
  returnvalue: null,
  state: 'waiting',
  taskRunMetrics: null,
  timestamp: 1,
} as const;

describe('routes/queues.$queueId.$jobId.tsx', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('loader fetches job and decodes job id from the path', async () => {
    mockExecute.mockResolvedValueOnce({ job: mockJob });

    const args: Route.LoaderArgs = {
      context: {},
      params: {
        jobId: encodeURIComponent('ralph-orch:abc'),
        queueId: 'Plans',
      },
      request: new Request('http://localhost/queues/Plans/ralph-orch%3Aabc'),
      unstable_pattern: '/queues/Plans/ralph-orch%3Aabc',
    };

    const result = await loader(args);

    expect(result.queueName).toBe('Plans');
    expect(result.job.id).toBe('job-1');
    expect(mockExecute).toHaveBeenCalledWith(args.request, expect.any(Object), {
      jobId: 'ralph-orch:abc',
      queueName: 'Plans',
    });
  });

  test('loader throws 400 when queue name is missing', async () => {
    const args: Route.LoaderArgs = {
      context: {},
      params: { jobId: 'job-1', queueId: '' },
      request: new Request('http://localhost'),
      unstable_pattern: '/queues',
    };

    await expect(loader(args)).rejects.toMatchObject({ status: 400 });
  });

  test('loader throws 404 when GraphQL returns no job', async () => {
    mockExecute.mockResolvedValueOnce({ job: null });

    const args: Route.LoaderArgs = {
      context: {},
      params: { jobId: 'missing', queueId: 'Plans' },
      request: new Request('http://localhost/queues/Plans/missing'),
      unstable_pattern: '/queues/Plans/missing',
    };

    await expect(loader(args)).rejects.toMatchObject({ status: 404 });
  });
});
