import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import {
  DEFAULT_PAGINATION_LIMIT,
  getPublicEnv,
} from '@openthrottle/react-router-utils';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useLoaderData, useSearchParams } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/queues.$queueId._index';
import { renderWithMemoryRouter } from '~/testing/route-fixtures';

import QueueDetailIndex, {
  loader,
  shouldRevalidate,
} from '../queues.$queueId._index';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

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

const emptyJobs: (typeof mockJob)[] = [];

const mockQueue = {
  activeCount: 0,
  completedCount: 1,
  delayedCount: 0,
  failedCount: 0,
  jobs: {
    hasNextPage: false,
    items: emptyJobs,
    totalCount: 0,
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
    backgroundActivities: [],
    canonical: 'http://localhost/',
    chatDock: { collapsedGroupIds: [], isOpen: true },
    defaultEditor: null,
    env: getPublicEnv(),
    permissions: [],
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
      handle: undefined,
      id: 'root',
      loaderData: rootData,
      params: {},
      pathname: '/',
    },
    {
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
    const Component = () => {
      return (
        <QueueDetailIndex
          actionData={undefined}
          loaderData={mockLoaderData}
          matches={buildQueueMatches(mockLoaderData)}
          params={{ queueId: 'plans' }}
        />
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByText('No jobs in this queue.')).toBeInTheDocument();
    expect(component.getByTestId('QueueJobsTable')).toBeInTheDocument();
  });

  test('renders QueueJobsTable when jobs are present', () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return (
        <QueueDetailIndex
          actionData={undefined}
          loaderData={{
            ...mockLoaderData,
            queue: {
              ...mockQueue,
              jobs: { hasNextPage: false, items: [mockJob], totalCount: 1 },
            },
          }}
          matches={buildQueueMatches({
            ...mockLoaderData,
            queue: {
              ...mockQueue,
              jobs: { hasNextPage: false, items: [mockJob], totalCount: 1 },
            },
          })}
          params={{ queueId: 'plans' }}
        />
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('QueueJobsTable')).toBeInTheDocument();
    expect(component.getByTestId('job-state-job-1')).toHaveTextContent(
      'Waiting',
    );
    expect(
      component.getByTestId('queue-jobs-table-plan-job-1'),
    ).toHaveAttribute('href', '/plans/plan-abc');
    expect(component.getByTestId('job-id-link-job-1')).toHaveAttribute(
      'href',
      '/queues/plans/job-1',
    );
  });

  describe('collapsible stats', () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local route wrapper
    const QueueRoute = (): React.ReactElement => {
      const loaderData = useLoaderData<typeof mockLoaderData>();
      const [searchParams] = useSearchParams();

      return (
        <>
          <QueueDetailIndex
            actionData={undefined}
            loaderData={loaderData}
            matches={buildQueueMatches(loaderData)}
            params={{ queueId: 'plans' }}
          />
          <span data-testid="qs">{searchParams.toString()}</span>
        </>
      );
    };

    const renderQueue = (
      entry: string,
    ): {
      readonly component: ReturnType<typeof renderWithMemoryRouter>;
      readonly routeLoader: ReturnType<typeof vi.fn>;
    } => {
      const routeLoader = vi.fn(() => {
        return mockLoaderData;
      });
      const component = renderWithMemoryRouter(
        [
          {
            Component: QueueRoute,
            HydrateFallback: () => null,
            loader: routeLoader,
            path: '/queues/:queueId',
            shouldRevalidate,
          },
        ],
        { initialEntries: [entry] },
      );

      return { component, routeLoader };
    };

    test('stats are closed by default', async () => {
      const { component } = renderQueue('/queues/plans');

      const toggle = await component.findByTestId('GlobalStatsToggleButton');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(component.queryByTestId('QueueStatRow')).toBeNull();
    });

    test('?stats=open deep-links the stats open', async () => {
      const { component } = renderQueue('/queues/plans?stats=open');

      expect(await component.findByTestId('QueueStatRow')).toBeInTheDocument();
    });

    test('the toolbar toggle opens the stats without re-running the loader', async () => {
      const user = userEvent.setup();
      const { component, routeLoader } = renderQueue(
        '/queues/plans?state=failed',
      );

      await user.click(await component.findByTestId('GlobalStatsToggleButton'));

      expect(await component.findByTestId('QueueStatRow')).toBeInTheDocument();
      const qs = new URLSearchParams(
        component.getByTestId('qs').textContent ?? '',
      );
      expect(qs.get('stats')).toBe('open');
      expect(qs.get('state')).toBe('failed');
      await waitFor(() => {
        expect(routeLoader).toHaveBeenCalledTimes(1);
      });
    });
  });
});
