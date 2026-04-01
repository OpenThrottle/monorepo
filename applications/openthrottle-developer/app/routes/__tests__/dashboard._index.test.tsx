import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import Index from '../dashboard._index';

const mockLoaderData = {
  activityByDate: {
    commits: [],
    hasNext: false,
    outputChunks: [],
    tasksUpdated: [],
    totalCount: 0,
  },
  dailyStatsRange: { items: [] },
  githubStats: {
    openPrCountByAuthor: [],
    prTimeInStateSummary: [],
  },
  queues: [],
};

describe('routes/dashboard._index.tsx', () => {
  test('should render dashboard layout with content grid and chart/activity columns', () => {
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

    expect(component.getByRole('main')).toBeInTheDocument();
    expect(component.getByTestId('dashboard-content-grid')).toBeInTheDocument();
    expect(
      component.getByTestId('dashboard-charts-column'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('dashboard-activity-column'),
    ).toBeInTheDocument();
  });

  test('should render chart cards and recent activity in correct columns', () => {
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

    const chartsColumn = component.getByTestId('dashboard-charts-column');
    const activityColumn = component.getByTestId('dashboard-activity-column');

    expect(
      chartsColumn.querySelector('[data-testid="DashboardDailyStatsCard"]'),
    ).toBeInTheDocument();
    expect(
      chartsColumn.querySelector('[data-testid="DashboardQueueStats"]'),
    ).toBeInTheDocument();
    expect(
      chartsColumn.querySelector(
        '[data-testid="DashboardOpenPrsByAuthorCard"]',
      ),
    ).toBeInTheDocument();
    expect(
      chartsColumn.querySelector('[data-testid="DashboardPrTimeInStateCard"]'),
    ).toBeInTheDocument();
    expect(
      activityColumn.querySelector('[data-testid="DashboardRecentActivity"]'),
    ).toBeInTheDocument();
  });
});
