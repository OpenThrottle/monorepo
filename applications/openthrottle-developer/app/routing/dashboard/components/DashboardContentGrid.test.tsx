import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardContentGrid } from './DashboardContentGrid';
import type { DashboardContentGridProps } from './DashboardContentGrid';

const mockCore: DashboardContentGridProps['core'] = Promise.resolve({
  activityByDate: {
    commits: [],
    hasNext: false,
    outputChunks: [],
    tasksUpdated: [],
    totalCount: 0,
  },
  dailyStatsRange: { items: [] },
  queues: [],
});

const mockGithubStats: DashboardContentGridProps['githubStats'] =
  Promise.resolve({
    closedPrCountByAuthor: [],
    openPrCountByAuthor: [],
    prTimeInStateSummary: [],
  });

const mockRecentChats: DashboardContentGridProps['recentChats'] =
  Promise.resolve({
    conversations: [],
    errorMessage: null,
    totalCount: 0,
  });

describe('DashboardContentGrid Component', () => {
  let component: RenderResult;
  let props: DashboardContentGridProps;

  beforeEach(() => {
    props = {
      core: mockCore,
      githubStats: mockGithubStats,
      recentChats: mockRecentChats,
    };

    const Component = () => <DashboardContentGrid {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('renders the grid scaffold synchronously before deferred data resolves', () => {
    expect(component.getByTestId('dashboard-content-grid')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: "This Week's Activity" }),
    ).toBeInTheDocument();
  });

  test('renders expand chart details links pointing to the daily-stats modal', () => {
    const links = component.getAllByRole('link', {
      name: /expand chart details/i,
    });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/dashboard?modal=daily-stats');
    }
  });

  test('streams the deferred queue health card into the grid', async () => {
    expect(
      await component.findByTestId('DashboardQueueHealthCard'),
    ).toBeInTheDocument();
  });
});
