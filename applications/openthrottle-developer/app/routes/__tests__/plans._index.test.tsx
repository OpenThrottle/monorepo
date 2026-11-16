import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { Route } from '@/app/routes/+types/plans._index';
import type { PlanCardFragment } from '~/__generated__/graphql';
import { PLANS_INDEX_EMPTY_COPY } from '~/routing/plans/data/data.copy';
import { buildRootMatch } from '~/testing/buildRootMatch';

import Index from '../plans._index';

const mockPlan: PlanCardFragment = {
  __typename: 'PlanObject',
  author: 'visormatt',
  category: 'feature',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Plan description',
  hasCustomRunConfig: false,
  id: 'plan-1',
  projectRelation: {
    __typename: 'ProjectObject',
    id: 'proj-1',
    name: 'Test Project',
  },
  status: 'IN_PROGRESS',
  tags: [],
  taskCount: 0,
  tasksCompletedCount: 0,
  title: 'Test Plan',
  updatedAt: '2025-01-02T00:00:00Z',
};

const mockLoaderDataPopulated: Route.ComponentProps['loaderData'] = {
  assigneeOptions: ['visormatt'],
  assignees: [],
  limit: 20,
  page: 1,
  plans: [mockPlan],
  statusCounts: [
    { __typename: 'PlanStatusCountObject', count: 4, status: 'in_progress' },
    { __typename: 'PlanStatusCountObject', count: 3, status: 'QUEUED' },
    { __typename: 'PlanStatusCountObject', count: 2, status: 'COMPLETED' },
  ],
  statuses: [],
  totalCount: 1,
  totalCountAll: 11,
};

const mockLoaderDataEmpty: Route.ComponentProps['loaderData'] = {
  assigneeOptions: [],
  assignees: [],
  limit: 20,
  page: 1,
  plans: [],
  statusCounts: [],
  statuses: [],
  totalCount: 0,
  totalCountAll: 0,
};

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/plans._index',
    loaderData: mockLoaderDataPopulated,
    params: {},
    pathname: '/',
  },
];

describe('routes/plans._index.tsx', () => {
  const renderPopulatedAt = (entry: string): ReturnType<typeof render> => {
    const Component = () => {
      return (
        <Index
          actionData={undefined}
          loaderData={mockLoaderDataPopulated}
          matches={matches}
          params={{}}
        />
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    return render(<RoutesStub initialEntries={[entry]} />);
  };

  describe('when the stats param is absent', () => {
    test('renders the plans list with the stat cards collapsed', () => {
      const component = renderPopulatedAt('/');

      expect(
        component.getByRole('link', { name: 'View plan: Test Plan' }),
      ).toBeInTheDocument();
      expect(component.queryByTestId('PlansStats')).not.toBeInTheDocument();
      expect(component.getByTestId('GlobalStatsToggleButton')).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });
  });

  describe('when ?stats=open', () => {
    test('renders the stat cards from the status counts, case-insensitively', () => {
      const component = renderPopulatedAt('/?stats=open');

      const stats = component.getByTestId('PlansStats');
      expect(stats).toBeInTheDocument();
      // In progress (4, from lower-case "in_progress") / Queued (3).
      expect(stats).toHaveTextContent('4');
      expect(stats).toHaveTextContent('3');
      // Completed (2).
      expect(stats).toHaveTextContent('2');
    });
  });

  test('shows the onboarding pitch for a new user (no plans, unfiltered)', () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return (
        <Index
          actionData={undefined}
          loaderData={mockLoaderDataEmpty}
          matches={matches}
          params={{}}
        />
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    // New-user block replaces the toolbar/table/pagination.
    expect(
      component.getByTestId('GlobalFeatureOnboarding'),
    ).toBeInTheDocument();
    expect(component.getByTestId('PlansIntroduction')).toBeInTheDocument();
    expect(component.queryByTestId('PlansTable')).not.toBeInTheDocument();
    expect(
      component.queryByTestId('OpenThrottlePagination'),
    ).not.toBeInTheDocument();
    expect(
      component.queryByRole('link', { name: /create your first plan/i }),
    ).not.toBeInTheDocument();
  });

  test('renders the onboarding trigger in the header when populated', () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return (
        <Index
          actionData={undefined}
          loaderData={mockLoaderDataPopulated}
          matches={matches}
          params={{}}
        />
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      component.getByTestId('GlobalFeatureOnboardingTrigger'),
    ).toBeInTheDocument();
    // Populated list: the pitch is not inline.
    expect(
      component.queryByTestId('GlobalFeatureOnboarding'),
    ).not.toBeInTheDocument();
  });

  test('reveals the onboarding modal over a populated list via ?modal=onboarding', () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return (
        <Index
          actionData={undefined}
          loaderData={mockLoaderDataPopulated}
          matches={matches}
          params={{}}
        />
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/plans' }]);
    const component = render(
      <RoutesStub initialEntries={['/plans?modal=onboarding']} />,
    );

    expect(
      component.getByTestId('GlobalFeatureOnboarding'),
    ).toBeInTheDocument();
    expect(
      component.queryByRole('link', { name: /create your first plan/i }),
    ).not.toBeInTheDocument();
  });

  test('shows PlanTasksEmpty (not onboarding) for a filtered no-results view', () => {
    // Plans exist in the workspace (totalCountAll > 0) but this filtered page
    // returned none — the terse filtered-empty state, not the new-user pitch.
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return (
        <Index
          actionData={undefined}
          loaderData={{
            ...mockLoaderDataEmpty,
            totalCountAll: 11,
          }}
          matches={matches}
          params={{}}
        />
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/plans' }]);
    const component = render(<RoutesStub initialEntries={['/plans?q=zzzz']} />);

    expect(
      component.queryByTestId('GlobalFeatureOnboarding'),
    ).not.toBeInTheDocument();
    expect(component.getByTestId('PlansTable')).toBeInTheDocument();
    expect(
      component.getByText(PLANS_INDEX_EMPTY_COPY.filteredTitle),
    ).toBeInTheDocument();
  });

  test('keeps every live filter, sort and view param in the /plans page links', () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return (
        <Index
          actionData={undefined}
          loaderData={{
            ...mockLoaderDataPopulated,
            assignees: ['visormatt'],
            limit: 10,
            page: 3,
            statuses: ['IN_PROGRESS', 'PENDING'],
            totalCount: 100,
          }}
          matches={matches}
          params={{}}
        />
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/plans' }]);
    const view = render(
      <RoutesStub
        initialEntries={[
          '/plans?assignee=visormatt&status=IN_PROGRESS&status=PENDING&sortBy=title&sortOrder=asc&view=card&page=3',
        ]}
      />,
    );

    expect(view.getByTestId('OpenThrottlePagination')).toBeInTheDocument();
    const pageLink = view.getByRole('link', { name: '4' });
    const href = pageLink.getAttribute('href') ?? '';
    expect(href).toContain('/plans?');
    expect(href).toContain('page=4');
    expect(href).toContain('limit=10');
    expect(href).toContain('assignee=visormatt');
    expect(href).toContain('status=IN_PROGRESS');
    expect(href).toContain('status=PENDING');
    expect(href).toContain('sortBy=title');
    expect(href).toContain('sortOrder=asc');
    expect(href).toContain('view=card');
    expect(view.getByText('Showing 21-30 of 100 plans')).toBeInTheDocument();
  });
});
