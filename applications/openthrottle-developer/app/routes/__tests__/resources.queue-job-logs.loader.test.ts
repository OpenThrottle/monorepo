// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { QueueJobLogsDocument } from '~/__generated__/graphql';
import { EMPTY_PAGE } from '~/routing/queues/data/queue-job-logs-page';
import type { Route } from '@/app/routes/+types/resources.queue-job-logs';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { loader } = await import('../resources.queue-job-logs');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const buildArgs = (search: string): Route.LoaderArgs => {
  const request = new Request(
    `http://localhost/resources/queue-job-logs${search}`,
  );
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/resources/queue-job-logs',
    request,
    url: new URL(request.url),
  };
};

describe('routes/resources.queue-job-logs loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('returns the empty page and skips GraphQL when jobId is missing', async () => {
    const result = await loader(buildArgs('?queueName=default'));

    expect(result).toEqual(EMPTY_PAGE);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('returns the empty page and skips GraphQL when queueName is missing', async () => {
    const result = await loader(buildArgs('?jobId=job-1'));

    expect(result).toEqual(EMPTY_PAGE);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('applies the default limit and null after when unspecified', async () => {
    const page = { events: [], hasMore: false, nextCursor: null };
    mockExecute.mockResolvedValue({ queueJobLogs: page });

    const result = await loader(buildArgs('?jobId=job-1&queueName=default'));

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      QueueJobLogsDocument,
      {
        input: {
          after: null,
          jobId: 'job-1',
          limit: 200,
          queueName: 'default',
        },
      },
    );
    expect(result).toBe(page);
  });

  test('forwards a cursor and clamps the limit to the max', async () => {
    const page = { events: [], hasMore: true, nextCursor: 'cursor-2' };
    mockExecute.mockResolvedValue({ queueJobLogs: page });

    await loader(
      buildArgs('?jobId=job-1&queueName=default&after=cursor-1&limit=10000'),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      QueueJobLogsDocument,
      {
        input: {
          after: 'cursor-1',
          jobId: 'job-1',
          limit: 500,
          queueName: 'default',
        },
      },
    );
  });

  test('falls back to the default limit when the limit param is invalid', async () => {
    const page = { events: [], hasMore: false, nextCursor: null };
    mockExecute.mockResolvedValue({ queueJobLogs: page });

    await loader(
      buildArgs('?jobId=job-1&queueName=default&limit=not-a-number'),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      QueueJobLogsDocument,
      {
        input: {
          after: null,
          jobId: 'job-1',
          limit: 200,
          queueName: 'default',
        },
      },
    );
  });
});
