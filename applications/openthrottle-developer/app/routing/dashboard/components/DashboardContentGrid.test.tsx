import * as React from 'react';
import { render, within } from '@testing-library/react';
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
    githubTokenConfigured: true,
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

  test('streams the GitHub stats cards when the token is configured', async () => {
    // Default mockGithubStats has githubTokenConfigured: true.
    expect(
      await component.findByTestId('DashboardPrTimeInStateCard'),
    ).toBeInTheDocument();
    expect(
      await component.findByTestId('DashboardOpenPrsByAuthorCard'),
    ).toBeInTheDocument();
  });

  test('shows the configure-GITHUB_TOKEN empty state when unconfigured', async () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <DashboardContentGrid
        {...props}
        githubStats={Promise.resolve({
          closedPrCountByAuthor: [],
          githubTokenConfigured: false,
          openPrCountByAuthor: [],
          prTimeInStateSummary: [],
        })}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const local = render(<RoutesStub />);
    // Scope queries to this render's container — the beforeEach (configured)
    // grid is also mounted in document.body.
    const scoped = within(local.container);

    // Both GitHub-stats blocks fall back to the empty state.
    const emptyStates = await scoped.findAllByTestId('OpenThrottleEmptyState');
    expect(emptyStates.length).toBeGreaterThan(0);
    expect(scoped.getAllByText(/GITHUB_TOKEN/).length).toBeGreaterThan(0);
    // The chart cards are not rendered when the token is unconfigured.
    expect(
      scoped.queryByTestId('DashboardPrTimeInStateCard'),
    ).not.toBeInTheDocument();
  });
});
