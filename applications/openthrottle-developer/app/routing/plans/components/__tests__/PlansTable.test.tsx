import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlansTable } from '../PlansTable';
import type { PlansTableProps } from '../PlansTable';
import type { PlanCardFragment } from '~/__generated__/graphql';

const mockPlans: PlanCardFragment[] = [
  {
    __typename: 'PlanObject',
    assignee: 'assignee1',
    author: 'author1',
    category: 'feature',
    createdAt: '2025-01-01T00:00:00Z',
    description: null,
    id: 'plan-1',
    projectRelation: {
      __typename: 'ProjectObject',
      id: 'proj-1',
      name: 'Project One',
    },
    status: 'IN_PROGRESS',
    summary: 'First plan summary',
    taskCount: 3,
    title: 'First Plan',
    updatedAt: '2025-01-03T00:00:00Z',
  },
  {
    __typename: 'PlanObject',
    assignee: null,
    author: 'author2',
    category: 'chore',
    createdAt: '2025-01-02T00:00:00Z',
    description: null,
    id: 'plan-2',
    projectRelation: {
      __typename: 'ProjectObject',
      id: 'proj-2',
      name: 'Project Two',
    },
    status: 'PENDING',
    summary: null,
    taskCount: 0,
    title: 'Second Plan',
    updatedAt: '2025-01-02T00:00:00Z',
  },
];

describe('PlansTable Component', () => {
  let component: RenderResult;
  let props: PlansTableProps;

  beforeEach(() => {
    props = { plans: [] };

    const Component = () => <PlansTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders table shell when empty', () => {
    expect(component.getByTestId('PlansTable')).toBeInTheDocument();
  });

  test('renders table structure with column headers', () => {
    const statusHeaders = component.getAllByRole('columnheader', {
      name: 'Status',
    });
    expect(statusHeaders.length).toBeGreaterThanOrEqual(1);
    const tasksHeaders = component.getAllByRole('columnheader', {
      name: 'Tasks',
    });
    expect(tasksHeaders.length).toBeGreaterThanOrEqual(1);
    const planHeaders = component.getAllByRole('columnheader', {
      name: 'Plan',
    });
    expect(planHeaders.length).toBeGreaterThanOrEqual(1);
    const actionsHeaders = component.getAllByRole('columnheader', {
      name: 'Actions',
    });
    expect(actionsHeaders.length).toBeGreaterThanOrEqual(1);
  });

  test('shows no results when plans is empty', () => {
    expect(component.getByText('No results.')).toBeDefined();
  });

  test('renders plans from props when provided', () => {
    const propsWithPlans: PlansTableProps = { plans: mockPlans };
    const Component = () => <PlansTable {...propsWithPlans} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getAllByRole, getByLabelText, getByRole, getByText } = render(
      <RoutesStub />,
    );

    expect(getByText('First Plan')).toBeDefined();
    expect(getByText('Second Plan')).toBeDefined();
    expect(getByText('In Progress')).toBeDefined();
    expect(getByText('Pending')).toBeDefined();
    const titleLink1 = getByRole('link', { name: 'View plan: First Plan' });
    expect(titleLink1).toHaveAttribute('href', '/plans/plan-1');
    const titleLink2 = getByRole('link', { name: 'View plan: Second Plan' });
    expect(titleLink2).toHaveAttribute('href', '/plans/plan-2');
    const planDetailsLinks = getAllByRole('link', { name: 'Plan Details' });
    expect(planDetailsLinks[0]).toHaveAttribute('href', '/plans/plan-1');
    expect(planDetailsLinks[1]).toHaveAttribute('href', '/plans/plan-2');
    expect(getByLabelText('3 tasks')).toBeDefined();
    expect(getByLabelText('0 tasks')).toBeDefined();
    const queuePlanButtons = getAllByRole('button', { name: /Queue plan/i });
    expect(queuePlanButtons).toHaveLength(2);
    expect(queuePlanButtons[0]).toHaveAttribute('type', 'submit');
  });

  test('shows author, assignee, category, summary and updated date when present', () => {
    const propsWithPlans: PlansTableProps = { plans: mockPlans };
    const Component = () => <PlansTable {...propsWithPlans} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { container, getByLabelText, getByText } = render(<RoutesStub />);

    expect(getByText('author1 → assignee1')).toBeDefined();
    expect(getByText('First plan summary')).toBeDefined();
    expect(getByText('feature')).toBeDefined();
    expect(getByLabelText('Category: feature')).toBeDefined();
    expect(container.textContent).toContain('Updated:');
    expect(container.textContent).toMatch(/\d{1,2}\/\d{1,2}\/2025/);
  });

  test('renders status pills as links when statusFilterUrls is provided', () => {
    const statusFilterUrls: Record<string, string> = {
      IN_PROGRESS: '/plans?status=IN_PROGRESS&page=1',
      PENDING: '/plans?status=PENDING&page=1',
    };
    const propsWithUrls: PlansTableProps = {
      plans: mockPlans,
      statusFilterUrls,
    };
    const Component = () => <PlansTable {...propsWithUrls} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByRole } = render(<RoutesStub />);

    const filterByInProgress = getByRole('link', {
      name: 'Filter by In Progress',
    });
    expect(filterByInProgress).toHaveAttribute(
      'href',
      '/plans?status=IN_PROGRESS&page=1',
    );
    const filterByPending = getByRole('link', {
      name: 'Filter by Pending',
    });
    expect(filterByPending).toHaveAttribute(
      'href',
      '/plans?status=PENDING&page=1',
    );
  });
});
