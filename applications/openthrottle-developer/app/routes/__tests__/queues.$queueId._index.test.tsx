import * as React from 'react';
import { render } from '@testing-library/react';
import {
  DEFAULT_PAGINATION_LIMIT,
  getPublicEnv,
} from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import QueueDetailIndex, { loader } from '../queues.$queueId._index';
import type { Route } from '@/app/routes/+types/queues.$queueId._index';
import { createTestRouterContext } from '~/testing/router-context';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const mockJob = {
  data: JSON.stringify({ planId: 'plan-abc', taskId: 'task-xyz' }),
  failedReason: null,
  finishedOn: null,
  id: 'job-1',
  name: null,
  processedOn: null,
  progress: null,
  returnvalue: null,
  state: 'waiting',
  timestamp: 1_700_000_000_000,
} as const;

const mockQueue = {
  activeCount: 0,
  completedCount: 1,
  delayedCount: 0,
  failedCount: 0,
  jobs: {
    hasNext: false,
    jobs: [] as (typeof mockJob)[],
  },
  name: 'plans',
  waitingCount: 0,
} as const;

const mockLoaderData = {
  limit: DEFAULT_PAGINATION_LIMIT,
  page: 1,
  queue: mockQueue,
} as const;

type QueueMatches = Route.ComponentProps['matches'];
type QueueLoaderData = Route.ComponentProps['loaderData'];

/** Build a fully-typed `matches` tuple for the QueueDetailIndex component (which ignores it). */
const buildQueueMatches = (loaderData: QueueLoaderData): QueueMatches => {
  const rootData = {
    canonical: 'http://localhost/',
    env: getPublicEnv(),
    rootLoaderDiagnostics: {},
    rootLoaderFailure: null,
    serverHealth: {
      api: 'unconfigured',
      database: 'unconfigured',
      redis: 'unconfigured',
      websocket: 'unconfigured',
    },
    user: null,
    userLoadOk: true,
  };

  return [
    {
      data: rootData,
      handle: undefined,
      id: 'root',
      loaderData: rootData,
      params: {},
      pathname: '/',
    },
    {
      data: loaderData,
      handle: undefined,
      id: 'routes/queues.$queueId._index',
      loaderData,
      params: {},
      pathname: '/',
    },
  ];
};

describe('routes/queues.$queueId.tsx', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('loader maps page and limit search params to GraphQL offset and limit', async () => {
    mockExecute.mockResolvedValueOnce({ queue: mockQueue });

    const args: Route.LoaderArgs = {
      context: createTestRouterContext(),
      params: { queueId: 'plans' },
      pattern: '/queues/plans',
      request: new Request('http://localhost/queues/plans?page=2&limit=50'),
      url: new URL('http://localhost/queues/plans?page=2&limit=50'),
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
      context: createTestRouterContext(),
      params: { queueId: 'plans' },
      pattern: '/queues/plans',
      request: new Request('http://localhost/queues/plans'),
      url: new URL('http://localhost/queues/plans'),
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

  test('renders empty state when queue has no jobs', () => {
    const Component = () => (
      <QueueDetailIndex
        actionData={undefined}
        loaderData={mockLoaderData}
        matches={buildQueueMatches(mockLoaderData)}
        params={{ queueId: 'plans' }}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByText('No jobs in this queue.')).toBeInTheDocument();
    expect(component.getByTestId('QueueJobsTable')).toBeInTheDocument();
  });

  test('renders QueueJobsTable when jobs are present', () => {
    const Component = () => (
      <QueueDetailIndex
        actionData={undefined}
        loaderData={{
          ...mockLoaderData,
          queue: {
            ...mockQueue,
            jobs: { hasNext: false, jobs: [mockJob] },
          },
        }}
        matches={buildQueueMatches({
          ...mockLoaderData,
          queue: {
            ...mockQueue,
            jobs: { hasNext: false, jobs: [mockJob] },
          },
        })}
        params={{ queueId: 'plans' }}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('QueueJobsTable')).toBeInTheDocument();
    expect(component.getByTestId('job-state-job-1')).toHaveTextContent(
      'waiting',
    );
    expect(
      component.getByTestId('queue-jobs-table-plan-job-1'),
    ).toHaveAttribute('href', '/plans/plan-abc');
    expect(
      component.getByRole('link', { name: 'View job details for job-1' }),
    ).toHaveAttribute('href', '/queues/plans/job-1');
  });
});
