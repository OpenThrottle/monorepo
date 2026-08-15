import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import Index from '../plans._index';
import { buildRootMatch } from '~/testing/root-match-fixture';
import {
  PLANS_INDEX_EMPTY_COPY,
  PLANS_ONBOARDING,
} from '~/routing/plans/data/data.copy';
import type { PlanCardFragment } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/plans._index';

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
  title: 'Test Plan',
  updatedAt: '2025-01-02T00:00:00Z',
};

const mockLoaderDataWithStats: Route.ComponentProps['loaderData'] = {
  assigneeOptions: ['visormatt'],
  assignees: [],
  limit: 20,
  page: 1,
  plans: [mockPlan],
  statusCounts: [
    {
      __typename: 'PlanStatusCountObject' as const,
      count: 3,
      status: 'IN_PROGRESS',
    },
    {
      __typename: 'PlanStatusCountObject' as const,
      count: 7,
      status: 'COMPLETED',
    },
    {
      __typename: 'PlanStatusCountObject' as const,
      count: 1,
      status: 'PENDING',
    },
  ],
  statuses: [],
  totalCount: 1,
  totalCountAll: 11,
  totalCountQueued: 2,
};

const mockLoaderDataEmpty: Route.ComponentProps['loaderData'] = {
  assigneeOptions: [],
  assignees: [],
  limit: 20,
  page: 1,
  plans: [],
  statusCounts: [
    {
      __typename: 'PlanStatusCountObject' as const,
      count: 0,
      status: 'IN_PROGRESS',
    },
    {
      __typename: 'PlanStatusCountObject' as const,
      count: 0,
      status: 'COMPLETED',
    },
  ],
  statuses: [],
  totalCount: 0,
  totalCountAll: 0,
  totalCountQueued: 0,
};

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/plans._index',
    loaderData: mockLoaderDataWithStats,
    params: {},
    pathname: '/',
  },
];

describe('routes/plans._index.tsx', () => {
  test('should render with distinct stat cards: Total, In progress (all), Completed (all)', () => {
    const Component = () => (
      <Index
        actionData={undefined}
        loaderData={mockLoaderDataWithStats}
        matches={matches}
        params={{}}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    const statCards = component.getAllByTestId('OpenThrottleStatCard');
    expect(statCards).toHaveLength(3);

    expect(component.getByText('Matching / Total plans')).toBeInTheDocument();
    expect(component.getByText('In progress / Queued')).toBeInTheDocument();
    expect(component.getByText('Completed (all)')).toBeInTheDocument();

    expect(component.getByText('1')).toBeInTheDocument();
    expect(component.getByText('3')).toBeInTheDocument();
    expect(component.getByText('7')).toBeInTheDocument();
  });

  test('should render empty state with zero counts in stat cards', () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <Index
        actionData={undefined}
        loaderData={mockLoaderDataEmpty}
        matches={matches}
        params={{}}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);
    expect(component.getByText('Matching / Total plans')).toBeInTheDocument();
    expect(component.getByText('In progress / Queued')).toBeInTheDocument();
    expect(component.getByText('Completed (all)')).toBeInTheDocument();
    expect(component.getAllByText('0').length).toBeGreaterThanOrEqual(3);
  });

  test('shows the onboarding pitch for a new user (no plans, unfiltered)', () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <Index
        actionData={undefined}
        loaderData={mockLoaderDataEmpty}
        matches={matches}
        params={{}}
      />
    );
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
      component.getByRole('link', { name: PLANS_ONBOARDING.cta.label }),
    ).toHaveAttribute('href', '/plans/create');
  });

  test('renders the onboarding trigger in the header when populated', () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <Index
        actionData={undefined}
        loaderData={mockLoaderDataWithStats}
        matches={matches}
        params={{}}
      />
    );
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
    const Component = () => (
      <Index
        actionData={undefined}
        loaderData={mockLoaderDataWithStats}
        matches={matches}
        params={{}}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/plans' }]);
    const component = render(
      <RoutesStub initialEntries={['/plans?modal=onboarding']} />,
    );

    expect(
      component.getByTestId('GlobalFeatureOnboarding'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: PLANS_ONBOARDING.cta.label }),
    ).toHaveAttribute('href', '/plans/create');
  });

  test('shows PlanTasksEmpty (not onboarding) for a filtered no-results view', () => {
    // Plans exist in the workspace (totalCountAll > 0) but this filtered page
    // returned none — the terse filtered-empty state, not the new-user pitch.
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
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

  test('should render pagination on /plans with assignee and status filters in links', () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <Index
        actionData={undefined}
        loaderData={{
          ...mockLoaderDataWithStats,
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
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const view = render(<RoutesStub />);

    expect(view.getByTestId('OpenThrottlePagination')).toBeInTheDocument();
    const pageLink = view.getByRole('link', { name: '3' });
    const href = pageLink.getAttribute('href') ?? '';
    expect(href).toContain('/plans?');
    expect(href).toContain('page=3');
    expect(href).toContain('limit=10');
    expect(href).toContain('assignee=visormatt');
    expect(href).toContain('status=IN_PROGRESS');
    expect(href).toContain('status=PENDING');
  });
});
