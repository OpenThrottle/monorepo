import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test } from 'vitest';
import { PlansTable } from '../PlansTable';
import type { PlansTableProps } from '../PlansTable';
import type { PlanCardFragment } from '~/__generated__/graphql';
import { PLANS_INDEX_EMPTY_COPY } from '~/routing/plans/data/data.copy';
import { renderRoutesStub } from '~/testing/route-fixtures';

const mockPlans: PlanCardFragment[] = [
  {
    __typename: 'PlanObject',
    assignee: 'assignee1',
    author: 'author1',
    category: 'feature',
    createdAt: '2025-01-01T00:00:00Z',
    description: null,
    hasCustomRunConfig: false,
    id: 'plan-1',
    projectRelation: {
      __typename: 'ProjectObject',
      id: 'proj-1',
      name: 'Project One',
    },
    status: 'IN_PROGRESS',
    summary: 'First plan summary',
    tags: [
      { __typename: 'PlanTagObject', dimension: 'phase', tag: 'discovery' },
      { __typename: 'PlanTagObject', dimension: 'domain', tag: 'frontend' },
    ],
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
    hasCustomRunConfig: true,
    id: 'plan-2',
    projectRelation: {
      __typename: 'ProjectObject',
      id: 'proj-2',
      name: 'Project Two',
    },
    status: 'PENDING',
    summary: null,
    tags: [],
    taskCount: 0,
    title: 'Second Plan',
    updatedAt: '2025-01-02T00:00:00Z',
  },
];

const renderPlansTable = (tableProps: PlansTableProps): RenderResult =>
  renderRoutesStub(
    <TooltipProvider>
      <PlansTable {...tableProps} />
    </TooltipProvider>,
  );

describe('PlansTable Component', () => {
  test('shows empty state when plans is empty', () => {
    const component = renderPlansTable({ plans: [] });

    expect(
      component.getByText(PLANS_INDEX_EMPTY_COPY.emptyTitle),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: PLANS_INDEX_EMPTY_COPY.emptyAction }),
    ).toHaveAttribute('href', '/plans/create');
  });

  test('renders table structure with column headers when plans exist', () => {
    const withPlans = renderPlansTable({ plans: mockPlans });

    expect(withPlans.getByTestId('PlansTable')).toBeInTheDocument();
    expect(
      withPlans.getByRole('columnheader', { name: 'Status' }),
    ).toBeInTheDocument();
    expect(
      withPlans.getByRole('columnheader', { name: 'Plan' }),
    ).toBeInTheDocument();
    expect(
      withPlans.getByRole('columnheader', { name: 'Actions' }),
    ).toBeInTheDocument();
  });

  test('renders plan tags inline on the row', () => {
    const { getByLabelText, queryByLabelText } = renderPlansTable({
      plans: mockPlans,
    });

    expect(getByLabelText('Tag: discovery')).toBeInTheDocument();
    expect(getByLabelText('Tag: frontend')).toBeInTheDocument();
    // Second plan has no tags — nothing extra rendered for it.
    expect(queryByLabelText('Tag: chore')).not.toBeInTheDocument();
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

  describe('custom run configuration indicator', () => {
    const customConfigLabel =
      'Custom workflow run configuration (differs from defaults)';

    test('shows indicator link when hasCustomRunConfig is true', () => {
      const { getByRole } = renderPlansTable({ plans: [mockPlans[1]] });

      const configLink = getByRole('link', { name: customConfigLabel });
      expect(configLink).toBeInTheDocument();
      expect(configLink).toHaveAttribute(
        'href',
        '/plans/plan-2?tab=configuration',
      );
    });

    test('does not show indicator when hasCustomRunConfig is false', () => {
      const { queryByRole } = renderPlansTable({ plans: [mockPlans[0]] });

      expect(
        queryByRole('link', { name: customConfigLabel }),
      ).not.toBeInTheDocument();
    });

    test('shows tooltip content on hover', async () => {
      const user = userEvent.setup();
      const { container, getByRole } = renderPlansTable({
        plans: [mockPlans[1]],
      });

      await user.hover(getByRole('link', { name: customConfigLabel }));

      await waitFor(() => {
        const tooltip = container.ownerDocument.querySelector(
          '[data-slot="tooltip-content"]',
        );
        expect(tooltip).toHaveTextContent(
          'Custom workflow run configuration (differs from defaults).',
        );
        expect(tooltip).toHaveTextContent(
          'Open the Configuration tab to view or edit.',
        );
      });
    });
  });
});
