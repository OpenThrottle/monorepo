import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub, useSearchParams, type UIMatch } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PLANS_DETAIL_TAB_SEARCH_PARAM } from '~/routing/plans/utils/parsers';
import { renderWithPlanDetailRouteData } from '~/routing/plans/testing/plan-detail-route-data';
import PlanDetail from '../plans.$planId._index';

const mockPlan = {
  __typename: 'PlanObject' as const,
  assignee: 'visormatt',
  author: 'visormatt',
  category: 'feature',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Plan description',
  id: 'plan-1',
  jobRunHooksJson: JSON.stringify({ hooks: [] }),
  projectId: 'proj-1',
  projectRelation: {
    __typename: 'ProjectObject' as const,
    id: 'proj-1',
    name: 'Test Project',
  },
  runConfigJson: JSON.stringify({ version: 1 }),
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
  sortOrder: 1000,
  status: 'PENDING',
  summary: null,
  title: 'Test Task',
  updatedAt: '2025-01-02T00:00:00Z',
};

function PlanDetailSearchParamsProbe(): React.ReactElement {
  const [searchParams] = useSearchParams();

  return (
    <span data-testid="plan-detail-search-params">
      {searchParams.toString()}
    </span>
  );
}

describe('routes/plans.$planId.tsx', () => {
  test('should render plan detail with tasks', async () => {
    const user = userEvent.setup();
    const loaderData = {
      plan: mockPlan,
      planOutputChunks: [],
      planRunAuditRows: [],
      recentPlanRuns: [],
      tasks: [mockTask],
    };
    const component = renderWithPlanDetailRouteData(
      <TooltipProvider>
        <PlanDetailSearchParamsProbe />
        <PlanDetail
          actionData={undefined}
          loaderData={loaderData}
          matches={[] as UIMatch[]}
          params={{ planId: mockPlan.id }}
        />
      </TooltipProvider>,
      loaderData,
      { initialEntries: ['/?view=table'] },
    );
    expect(component.getByTestId('GlobalHeading')).toBeInTheDocument();

    expect(component.getByText('Test Plan')).toBeInTheDocument();
    expect(component.getByText('In Progress')).toBeInTheDocument();
    // MarkdownRenderer compiles the description asynchronously, so await it.
    expect(
      (await component.findAllByText('Plan description')).length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole('tab', { name: /Tasks/ }));

    // Tasks tab content only renders once the search-param navigation settles.
    expect(await component.findByText('Test Task')).toBeInTheDocument();

    const paramsAfterTasks = new URLSearchParams(
      screen.getByTestId('plan-detail-search-params').textContent ?? '',
    );
    expect(paramsAfterTasks.get(PLANS_DETAIL_TAB_SEARCH_PARAM)).toBe('tasks');
    expect(paramsAfterTasks.get('view')).toBe('table');
  });

  test('should render plan detail with no tasks', async () => {
    const user = userEvent.setup();
    const loaderData = {
      plan: mockPlan,
      planOutputChunks: [],
      planRunAuditRows: [],
      recentPlanRuns: [],
      tasks: [],
    };
    const component = renderWithPlanDetailRouteData(
      <TooltipProvider>
        <PlanDetail
          actionData={undefined}
          loaderData={loaderData}
          matches={[] as UIMatch[]}
          params={{ planId: mockPlan.id }}
        />
      </TooltipProvider>,
      loaderData,
      { initialEntries: ['/?view=table'] },
    );
    expect(component.getByTestId('GlobalHeading')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Tasks/ }));

    expect(await component.findByText('No plans yet')).toBeInTheDocument();
    expect(
      component.getByText('Create your first plan to get started.'),
    ).toBeInTheDocument();
  });

  test('should render empty state when plan not found', () => {
    const Component = () => (
      <TooltipProvider>
        <PlanDetail
          actionData={undefined}
          loaderData={{
            plan: null,
            planOutputChunks: [],
            planRunAuditRows: [],
            recentPlanRuns: [],
            tasks: [],
          }}
          matches={[] as UIMatch[]}
          params={{ planId: mockPlan.id }}
        />
      </TooltipProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);
    expect(component.getByTestId('OpenThrottleEmptyState')).toBeInTheDocument();
    expect(component.getByText('Plan not found')).toBeInTheDocument();
    expect(component.getByText(/does not exist/)).toBeInTheDocument();
  });

  test('opens Tasks tab from URL and drops param when switching back to Details', async () => {
    const user = userEvent.setup();
    const loaderData = {
      plan: mockPlan,
      planOutputChunks: [],
      planRunAuditRows: [],
      recentPlanRuns: [],
      tasks: [mockTask],
    };
    renderWithPlanDetailRouteData(
      <TooltipProvider>
        <PlanDetailSearchParamsProbe />
        <PlanDetail
          actionData={undefined}
          loaderData={loaderData}
          matches={[] as UIMatch[]}
          params={{ planId: mockPlan.id }}
        />
      </TooltipProvider>,
      loaderData,
      {
        initialEntries: [`/?${PLANS_DETAIL_TAB_SEARCH_PARAM}=tasks&view=table`],
      },
    );

    const tasksTab = screen.getByRole('tab', { name: /Tasks/ });
    expect(tasksTab).toHaveAttribute('data-state', 'active');

    await user.click(screen.getByRole('tab', { name: 'Details' }));

    // The tab→search-param navigation is async (loader revalidation); wait for it.
    await waitFor(() => {
      const params = new URLSearchParams(
        screen.getByTestId('plan-detail-search-params').textContent ?? '',
      );
      expect(params.get(PLANS_DETAIL_TAB_SEARCH_PARAM)).toBeNull();
    });

    const paramsAfterDetails = new URLSearchParams(
      screen.getByTestId('plan-detail-search-params').textContent ?? '',
    );
    expect(paramsAfterDetails.get('view')).toBe('table');
  });

  test('invalid plansDetailTab falls back to Details', () => {
    const loaderData = {
      plan: mockPlan,
      planOutputChunks: [],
      planRunAuditRows: [],
      recentPlanRuns: [],
      tasks: [],
    };
    renderWithPlanDetailRouteData(
      <TooltipProvider>
        <PlanDetail
          actionData={undefined}
          loaderData={loaderData}
          matches={[] as UIMatch[]}
          params={{ planId: mockPlan.id }}
        />
      </TooltipProvider>,
      loaderData,
      {
        initialEntries: [`/?${PLANS_DETAIL_TAB_SEARCH_PARAM}=nope&view=table`],
      },
    );

    expect(screen.getByRole('tab', { name: 'Details' })).toHaveAttribute(
      'data-state',
      'active',
    );
  });
});
