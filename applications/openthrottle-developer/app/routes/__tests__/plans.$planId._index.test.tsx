import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import PlanDetail from '../plans.$planId._index';

const mockPlan = {
  __typename: 'PlanObject' as const,
  assignee: 'visormatt',
  author: 'visormatt',
  category: 'feature',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Plan description',
  id: 'plan-1',
  projectId: 'proj-1',
  projectRelation: {
    __typename: 'ProjectObject' as const,
    id: 'proj-1',
    name: 'Test Project',
  },
  status: 'IN_PROGRESS',
  summary: 'Plan summary',
  title: 'Test Plan',
  updatedAt: '2025-01-02T00:00:00Z',
};

const mockTask = {
  __typename: 'TaskObject' as const,
  category: 'product',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Task description',
  id: 'task-1',
  planId: 'plan-1',
  requirementsJson: '[]',
  status: 'PENDING',
  summary: null,
  title: 'Test Task',
  updatedAt: '2025-01-02T00:00:00Z',
};

describe('routes/plans.$planId.tsx', () => {
  test('should render plan detail with tasks', () => {
    const Component = () => (
      <PlanDetail
        actionData={undefined}
        loaderData={{ plan: mockPlan, tasks: [mockTask] }}
        matches={[] as any}
        params={{ planId: mockPlan.id }}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);
    expect(component.getByRole('main')).toBeInTheDocument();
    expect(component.getAllByText('Test Plan').length).toBeGreaterThanOrEqual(
      1,
    );
    expect(component.getByText('In Progress')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: 'Test Project' }),
    ).toHaveAttribute('href', '/projects/proj-1');
    expect(component.getByText('Plan description')).toBeInTheDocument();
    expect(component.getByText('Plan summary')).toBeInTheDocument();
    expect(component.getByText('Test Task')).toBeInTheDocument();
    expect(component.getByRole('link', { name: 'Plans' })).toHaveAttribute(
      'href',
      '/plans',
    );
  });

  test('should render plan detail with no tasks', () => {
    const Component = () => (
      <PlanDetail
        actionData={undefined}
        loaderData={{ plan: mockPlan, tasks: [] }}
        matches={[] as any}
        params={{ planId: mockPlan.id }}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);
    expect(component.getByRole('main')).toBeInTheDocument();
    expect(component.getByText('No tasks')).toBeInTheDocument();
    expect(
      component.getByText('This plan has no tasks yet.'),
    ).toBeInTheDocument();
  });

  test('should render empty state when plan not found', () => {
    const Component = () => (
      <PlanDetail
        actionData={undefined}
        loaderData={{ plan: null, tasks: [] }}
        matches={[] as any}
        params={{ planId: mockPlan.id }}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);
    expect(component.getByRole('main')).toBeInTheDocument();
    expect(component.getByText('Plan not found')).toBeInTheDocument();
    expect(component.getByText(/does not exist/)).toBeInTheDocument();
  });
});
