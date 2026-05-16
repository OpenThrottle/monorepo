import { DEFAULT_PAGINATION_LIMIT } from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { loader } from '../queues.$queueId._index';
import type { Route } from '@/app/routes/+types/queues.$queueId._index';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const mockQueue = {
  activeCount: 0,
  completedCount: 1,
  delayedCount: 0,
  failedCount: 0,
  jobs: {
    hasNext: false,
    jobs: [] as {
      data?: string | null;
      failedReason?: string | null;
      id: string;
      name?: string | null;
      state: string;
    }[],
  },
  name: 'plans',
  waitingCount: 0,
} as const;

describe('routes/queues.$queueId.tsx', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('loader maps page and limit search params to GraphQL offset and limit', async () => {
    mockExecute.mockResolvedValueOnce({ queue: mockQueue });

    const args: Route.LoaderArgs = {
      context: {},
      params: { queueId: 'plans' },
      request: new Request('http://localhost/queues/plans?page=2&limit=50'),
      unstable_pattern: '/queues/plans',
    };

    const result = await loader(args);

    expect(result.page).toBe(2);
    expect(result.limit).toBe(50);
    expect(mockExecute).toHaveBeenCalledWith(args.request, expect.any(Object), {
      input: expect.objectContaining({
        limit: 50,
        name: 'plans',
        offset: 50,
      }),
    });
  });

  test('loader defaults page to 1 and uses DEFAULT_PAGINATION_LIMIT when params omitted', async () => {
    mockExecute.mockResolvedValueOnce({ queue: mockQueue });

    const args: Route.LoaderArgs = {
      context: {},
      params: { queueId: 'plans' },
      request: new Request('http://localhost/queues/plans'),
      unstable_pattern: '/queues/plans',
    };

    const result = await loader(args);

    expect(result.page).toBe(1);
    expect(result.limit).toBe(DEFAULT_PAGINATION_LIMIT);
    expect(mockExecute).toHaveBeenCalledWith(args.request, expect.any(Object), {
      input: expect.objectContaining({
        limit: DEFAULT_PAGINATION_LIMIT,
        offset: 0,
      }),
    });
  });
});
