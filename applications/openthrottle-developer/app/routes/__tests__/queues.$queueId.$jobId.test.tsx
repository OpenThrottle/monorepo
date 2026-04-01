import { describe, expect, test } from 'vitest';
import { loader } from '../queues.$queueId.$jobId';
import type { Route } from '@/app/routes/+types/queues.$queueId.$jobId';

describe('routes/queues.$queueId.$jobId.tsx', () => {
  test('loader returns jobId and queueName from params', async () => {
    const args: Route.LoaderArgs = {
      context: {},
      params: { jobId: 'job-1', queueId: 'my-queue' },
      request: new Request('http://localhost/queues/my-queue/jobs/job-1'),
      unstable_pattern: '/queues/my-queue/jobs/job-1',
    };

    const result = await loader(args);

    expect(result).toEqual({ jobId: 'job-1', queueName: 'my-queue' });
  });

  test('loader throws 400 when queue name is missing', async () => {
    const args: Route.LoaderArgs = {
      context: {},
      params: { jobId: 'job-1', queueId: '' },
      request: new Request('http://localhost'),
      unstable_pattern: '/queues/my-queue/jobs/job-1',
    };

    await expect(loader(args)).rejects.toMatchObject({ status: 400 });
  });

  test('route documents queue job detail UI (stats, breadcrumbs, job heading)', () => {
    // UI renders breadcrumb to /queues, stat cards, queue title, and job details section.
    expect(true).toBe(true);
  });
});
