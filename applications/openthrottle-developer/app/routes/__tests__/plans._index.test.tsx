import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import Index from '../plans._index';
import type { PlanCardFragment } from '~/__generated__/graphql';

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
  taskCount: 0,
  title: 'Test Plan',
  updatedAt: '2025-01-02T00:00:00Z',
};

const mockLoaderDataWithStats = {
  assigneeOptions: ['visormatt'],
  assignees: [] as string[],
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
  statuses: [] as string[],
  totalCount: 1,
  totalCountAll: 11,
  totalCountQueued: 2,
};

const mockLoaderDataEmpty = {
  assigneeOptions: [] as string[],
  assignees: [] as string[],
  limit: 20,
  page: 1,
  plans: [] as PlanCardFragment[],
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
  statuses: [] as string[],
  totalCount: 0,
  totalCountAll: 0,
  totalCountQueued: 0,
};

describe('routes/plans._index.tsx', () => {
  test('should render with distinct stat cards: Total, In progress (all), Completed (all)', () => {
    const Component = () => (
      <Index
        actionData={undefined}
        loaderData={mockLoaderDataWithStats}
        matches={[]}
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
    const Component = () => (
      <Index
        actionData={undefined}
        loaderData={mockLoaderDataEmpty}
        matches={[]}
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

  test('should render pagination on /plans with assignee and status filters in links', () => {
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
        matches={[] as never}
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
