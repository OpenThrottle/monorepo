import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import Index from '../dashboard._index';

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

describe('routes/dashboard._index.tsx', () => {
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
