import * as React from 'react';
import { render } from '@testing-library/react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Index, { loader } from '../dashboard._index';
import type { Route } from '@/app/routes/+types/dashboard._index';
import { createTestRouterContext } from '~/testing/router-context';

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

const mockLoaderData = {
  activityByDate: {
    commits: [],
    hasNext: false,
    outputChunks: [],
    tasksUpdated: [],
    totalCount: 0,
  },
  dailyStatsRange: { items: [] },
  githubStats: mockGithubStats,
  queues: [],
};

const mockDashboardQuery = {
  activityByDate: mockLoaderData.activityByDate,
  dailyStatsRange: mockLoaderData.dailyStatsRange,
  queues: mockLoaderData.queues,
};

describe('routes/dashboard._index.tsx', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  describe('loader', () => {
    test('should parse owner and repo from search params for GitHub stats', async () => {
      mockExecute
        .mockResolvedValueOnce(mockDashboardQuery)
        .mockResolvedValueOnce(mockGithubStats);

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

      expect(result.githubStats).toEqual(mockGithubStats);
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
        .mockResolvedValueOnce(mockGithubStats);

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

  test('should render dashboard content grid with chart cards', () => {
    const Component = () => (
      <Index
        actionData={undefined}
        loaderData={mockLoaderData}
        matches={[] as any}
        params={{}}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    const grid = component.getByTestId('dashboard-content-grid');
    expect(grid).toBeInTheDocument();
    expect(
      grid.querySelector('[data-testid="DashboardDailyStatsCard"]'),
    ).toBeInTheDocument();
    // expect(
    //   grid.querySelector('[data-testid="DashboardQueueStats"]'),
    // ).toBeInTheDocument();
    expect(
      grid.querySelector('[data-testid="DashboardPrTimeInStateCard"]'),
    ).toBeInTheDocument();
    expect(
      grid.querySelector('[data-testid="DashboardOpenPrsByAuthorCard"]'),
    ).toBeInTheDocument();
  });

  test('should render PRs by author section with full githubStats from loader', () => {
    const Component = () => (
      <Index
        actionData={undefined}
        loaderData={mockLoaderData}
        matches={[] as any}
        params={{}}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      component.getByRole('heading', { level: 3, name: 'PRs by author' }),
    ).toBeInTheDocument();

    const card = component.getByTestId('DashboardOpenPrsByAuthorCard');
    expect(card).toBeInTheDocument();
    const chartRoot = card.querySelector('.recharts-responsive-container');
    expect(chartRoot).toBeInTheDocument();
    expect(chartRoot).toHaveStyle({ '--color-closed': 'var(--chart-2)' });
    expect(chartRoot).toHaveStyle({ '--color-open': 'var(--chart-1)' });
  });

  test('should render PRs by author empty state when both series are empty', () => {
    const Component = () => (
      <Index
        actionData={undefined}
        loaderData={{
          ...mockLoaderData,
          githubStats: {
            ...mockGithubStats,
            closedPrCountByAuthor: [],
            openPrCountByAuthor: [],
          },
        }}
        matches={[] as any}
        params={{}}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByText(/No PRs by author/)).toBeInTheDocument();
    expect(
      component
        .getByTestId('DashboardOpenPrsByAuthorCard')
        .querySelector('.recharts-responsive-container'),
    ).not.toBeInTheDocument();
  });

  test('should render recent activity outside the content grid', () => {
    const Component = () => (
      <Index
        actionData={undefined}
        loaderData={mockLoaderData}
        matches={[] as any}
        params={{}}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      component.getByTestId('DashboardRecentActivity'),
    ).toBeInTheDocument();
  });
});
