import * as React from 'react';
import { render } from '@testing-library/react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Index, { loader } from '../dashboard._index';
import type { Route } from '@/app/routes/+types/dashboard._index';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { createTestRouterContext } from '@openthrottle/react-router-testing';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const mockGithubStats = {
  closedPrCountByAuthor: [
    { author: 'visormatt', openCount: 1 },
    { author: 'other-user', openCount: 3 },
  ],
  openPrCountByAuthor: [
    { author: 'visormatt', openCount: 5 },
    { author: 'other-user', openCount: 2 },
  ],
  prTimeInStateSummary: [{ avgDaysInState: 2.5, count: 4, state: 'open' }],
};

const mockDashboardQuery = {
  activityByDate: {
    commits: [],
    hasNext: false,
    outputChunks: [],
    tasksUpdated: [],
    totalCount: 0,
  },
  dailyStatsRange: { items: [] },
  queues: [],
};

// Raw GraphQL shape returned by the 3rd executeGraphqlWithAuth call (recentChats
// via callListAgentConversations, which maps `data.listAgentConversations`).
const mockConversationsQuery = {
  listAgentConversations: {
    conversations: [
      {
        id: 'c1',
        status: 'active',
        title: 'First chat',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ],
    totalCount: 1,
  },
};

// Deferred loader shape: `core` (dashboard query) + `githubStats` + `recentChats`,
// each a promise. `recentChats` is the mapped ListAgentConversationsResult.
const mockLoaderData = {
  core: Promise.resolve(mockDashboardQuery),
  githubStats: Promise.resolve(mockGithubStats),
  recentChats: Promise.resolve({
    conversations: mockConversationsQuery.listAgentConversations.conversations,
    errorMessage: null,
    totalCount: 1,
  }),
};

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/dashboard._index',
    loaderData: mockLoaderData,
    params: {},
    pathname: '/',
  },
];

describe('routes/dashboard._index.tsx', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  describe('loader', () => {
    test('should parse owner and repo from search params for GitHub stats', async () => {
      mockExecute
        .mockResolvedValueOnce(mockDashboardQuery)
        .mockResolvedValueOnce(mockGithubStats)
        .mockResolvedValueOnce(mockConversationsQuery);

      const request = new Request(
        'http://localhost/dashboard?owner=openthrottle&repo=openthrottle',
      );
      const args: Route.LoaderArgs = {
        context: createTestRouterContext(),
        params: {},
        pattern: '/dashboard',
        request,
        url: new URL(request.url),
      };

      const result = await loader(args);

      // All three queries fire concurrently (no serial await gate): core,
      // githubStats, and recentChats are each invoked by the time the loader
      // returns.
      expect(mockExecute).toHaveBeenCalledTimes(3);
      // githubStats is now a deferred promise — await it to assert its value.
      expect(await result.githubStats).toEqual(mockGithubStats);
      expect(mockExecute).toHaveBeenNthCalledWith(
        2,
        request,
        expect.any(Object),
        { owner: 'openthrottle', repo: 'openthrottle' },
      );
    });

    test('should default owner and repo when search params are missing or invalid', async () => {
      mockExecute
        .mockResolvedValueOnce(mockDashboardQuery)
        .mockResolvedValueOnce(mockGithubStats)
        .mockResolvedValueOnce(mockConversationsQuery);

      const request = new Request(
        'http://localhost/dashboard?owner=unknown&repo=bad',
      );
      const args: Route.LoaderArgs = {
        context: createTestRouterContext(),
        params: {},
        pattern: '/dashboard',
        request,
        url: new URL(request.url),
      };

      await loader(args);

      expect(mockExecute).toHaveBeenNthCalledWith(
        2,
        request,
        expect.any(Object),
        { owner: 'openthrottle', repo: 'monorepo' },
      );
    });
  });

  test('renders the intro banner + grid scaffold synchronously', () => {
    const Component = () => (
      <Index
        actionData={undefined}
        loaderData={mockLoaderData}
        matches={matches}
        params={{}}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    // The shell (intro + grid scaffold + static toolbar) is not deferred, so it
    // is present on the first synchronous render before any promise resolves.
    expect(component.getByTestId('dashboard-content-grid')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { level: 3, name: 'PR Time in State' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('heading', { level: 3, name: 'PRs by author' }),
    ).toBeInTheDocument();
  });

  test('streams the deferred chart + PR cards into the grid', async () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <Index
        actionData={undefined}
        loaderData={mockLoaderData}
        matches={matches}
        params={{}}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    // Deferred cards resolve behind Suspense/Await — query async.
    expect(
      await component.findByTestId('DashboardDailyStatsCard'),
    ).toBeInTheDocument();
    expect(
      await component.findByTestId('DashboardPrTimeInStateCard'),
    ).toBeInTheDocument();
    const card = await component.findByTestId('DashboardOpenPrsByAuthorCard');
    expect(card).toBeInTheDocument();

    const chartRoot = card.querySelector('.recharts-responsive-container');
    expect(chartRoot).toBeInTheDocument();
    expect(chartRoot).toHaveStyle({ '--color-closed': 'var(--chart-2)' });
    expect(chartRoot).toHaveStyle({ '--color-open': 'var(--chart-1)' });
  });

  test('renders PRs by author empty state when both series are empty', async () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <Index
        actionData={undefined}
        loaderData={{
          ...mockLoaderData,
          githubStats: Promise.resolve({
            ...mockGithubStats,
            closedPrCountByAuthor: [],
            openPrCountByAuthor: [],
          }),
        }}
        matches={matches}
        params={{}}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(await component.findByText(/No PRs by author/)).toBeInTheDocument();
    expect(
      component
        .getByTestId('DashboardOpenPrsByAuthorCard')
        .querySelector('.recharts-responsive-container'),
    ).not.toBeInTheDocument();
  });

  test('streams recent activity outside the content grid', async () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <Index
        actionData={undefined}
        loaderData={mockLoaderData}
        matches={matches}
        params={{}}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      await component.findByTestId('DashboardRecentActivity'),
    ).toBeInTheDocument();
  });

  test('degrades the PR cards inline when githubStats rejects', async () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <Index
        actionData={undefined}
        loaderData={{
          ...mockLoaderData,
          githubStats: Promise.reject(new Error('github boom')),
        }}
        matches={matches}
        params={{}}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    // Both PR-card boundaries render their inline errorElement (degraded), and
    // the route does NOT throw to the ErrorBoundary — the core chart still
    // streams in. One error per PR card boundary.
    const errors = await component.findAllByText(/Couldn’t load PR stats\./);
    expect(errors).toHaveLength(2);
    expect(
      component.queryByTestId('DashboardOpenPrsByAuthorCard'),
    ).not.toBeInTheDocument();
    // Core-backed activity chart is unaffected by the GitHub failure.
    expect(
      await component.findByTestId('DashboardDailyStatsCard'),
    ).toBeInTheDocument();
  });
});
