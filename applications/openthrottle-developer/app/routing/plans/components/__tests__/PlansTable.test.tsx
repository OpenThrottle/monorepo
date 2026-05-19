import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlansTable } from '../PlansTable';
import type { PlansTableProps } from '../PlansTable';
import type { PlanCardFragment } from '~/__generated__/graphql';
import { renderRoutesStub } from '~/testing/route-fixtures';

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

const renderPlansTable = (tableProps: PlansTableProps): RenderResult =>
  renderRoutesStub(<PlansTable {...tableProps} />);

describe('PlansTable Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderPlansTable({ plans: [] });
  });

  test('shows empty state when plans is empty', () => {
    expect(component.getByText('No plans yet')).toBeInTheDocument();
    expect(component.getByRole('link', { name: 'New plan' })).toHaveAttribute(
      'href',
      '/plans/create',
    );
  });

  test('renders table structure with column headers when plans exist', () => {
    const withPlans = renderPlansTable({ plans: mockPlans });

    expect(withPlans.getByTestId('PlansTable')).toBeInTheDocument();
    expect(
      withPlans.getByRole('columnheader', { name: 'Status' }),
    ).toBeInTheDocument();
    expect(
      withPlans.getByRole('columnheader', { name: 'Tasks' }),
    ).toBeInTheDocument();
    expect(
      withPlans.getByRole('columnheader', { name: 'Plan' }),
    ).toBeInTheDocument();
    expect(
      withPlans.getByRole('columnheader', { name: 'Actions' }),
    ).toBeInTheDocument();
  });

  test('renders plans from props when provided', () => {
    const { getAllByRole, getByLabelText, getByRole, getByText } =
      renderPlansTable({ plans: mockPlans });

    expect(getByText('First Plan')).toBeDefined();
    expect(getByText('Second Plan')).toBeDefined();
    expect(getByText('In Progress')).toBeDefined();
    expect(getByText('Pending')).toBeDefined();
    const titleLink1 = getByRole('link', { name: 'View plan: First Plan' });
    expect(titleLink1).toHaveAttribute('href', '/plans/plan-1');
    const titleLink2 = getByRole('link', { name: 'View plan: Second Plan' });
    expect(titleLink2).toHaveAttribute('href', '/plans/plan-2');
    expect(getByLabelText('3 tasks')).toBeDefined();
    expect(getByLabelText('0 tasks')).toBeDefined();
    const queuePlanButtons = getAllByRole('button', {
      name: /queue plan first plan/i,
    });
    expect(queuePlanButtons.length).toBeGreaterThanOrEqual(1);

    const killButtons = getAllByRole('button', {
      name: /Kill plan run for First Plan/i,
    });
    expect(killButtons).toHaveLength(1);
  });

  test('shows author, assignee, and updated date when present', () => {
    const { container, getByText } = renderPlansTable({
      plans: mockPlans,
    });

    expect(getByText('author1 → assignee1')).toBeDefined();
    expect(container.textContent).toContain('Updated:');
    expect(container.textContent).toMatch(/\d{1,2}\/\d{1,2}\/2025/);
  });

  test('renders status badges when statusFilterUrls is provided', () => {
    const statusFilterUrls: Record<string, string> = {
      IN_PROGRESS: '/plans?status=IN_PROGRESS&page=1',
      PENDING: '/plans?status=PENDING&page=1',
    };
    const { getByText, queryByRole } = renderPlansTable({
      plans: mockPlans,
      statusFilterUrls,
    });

    expect(getByText('In Progress')).toBeInTheDocument();
    expect(getByText('Pending')).toBeInTheDocument();
    expect(
      queryByRole('link', { name: 'Filter by In Progress' }),
    ).not.toBeInTheDocument();
  });
});
