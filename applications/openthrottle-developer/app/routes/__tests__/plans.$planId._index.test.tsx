import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getPublicEnv } from '@openthrottle/react-router-utils';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub, useSearchParams } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PLANS_DETAIL_TAB_SEARCH_PARAM } from '~/routing/plans/utils/parsers';
import { renderWithPlanDetailRouteData } from '~/routing/plans/testing/plan-detail-route-data';
import PlanDetail from '../plans.$planId._index';
import type { Route } from '@/app/routes/+types/plans.$planId._index';

type PlanDetailMatches = Route.ComponentProps['matches'];
type PlanDetailLoaderData = Route.ComponentProps['loaderData'];

/**
 * Build a fully-typed `matches` tuple for the PlanDetail component. The component
 * ignores `matches`, so the root entry carries a minimal-but-valid root loader
 * payload and the route entry mirrors the seed loader data.
 */
const buildPlanDetailMatches = (
  loaderData: PlanDetailLoaderData,
): PlanDetailMatches => {
  const rootData = {
    canonical: 'http://localhost/',
    env: getPublicEnv(),
    rootLoaderDiagnostics: {},
    rootLoaderFailure: null,
    serverHealth: {
      api: 'unconfigured',
      database: 'unconfigured',
      redis: 'unconfigured',
      websocket: 'unconfigured',
    },
    user: null,
    userLoadOk: true,
  };

  return [
    {
      handle: undefined,
      id: 'root',
      loaderData: rootData,
      params: {},
      pathname: '/',
    },
    {
      handle: undefined,
      id: 'routes/plans.$planId._index',
      loaderData,
      params: {},
      pathname: '/',
    },
  ];
};

const mockPlan = {
  __typename: 'PlanObject' as const,
  afterHooks: [],
  assignee: 'visormatt',
  author: 'visormatt',
  beforeHooks: [],
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
  tags: [],
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
      linkedArtifacts: [],
      plan: mockPlan,
      planOutputChunks: [],
      planRunAuditRows: [],
      recentPlanRuns: [],
      ruleApplications: [],
      tagVocabulary: [],
      tasks: [mockTask],
      workspaceRepositories: [],
    };
    const component = renderWithPlanDetailRouteData(
      <TooltipProvider>
        <PlanDetailSearchParamsProbe />
        <PlanDetail
          actionData={undefined}
          loaderData={loaderData}
          matches={buildPlanDetailMatches(loaderData)}
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
      linkedArtifacts: [],
      plan: mockPlan,
      planOutputChunks: [],
      planRunAuditRows: [],
      recentPlanRuns: [],
      ruleApplications: [],
      tagVocabulary: [],
      tasks: [],
      workspaceRepositories: [],
    };
    const component = renderWithPlanDetailRouteData(
      <TooltipProvider>
        <PlanDetail
          actionData={undefined}
          loaderData={loaderData}
          matches={buildPlanDetailMatches(loaderData)}
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
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <TooltipProvider>
        <PlanDetail
          actionData={undefined}
          loaderData={{
            linkedArtifacts: [],
            plan: null,
            planOutputChunks: [],
            planRunAuditRows: [],
            recentPlanRuns: [],
            ruleApplications: [],
            tagVocabulary: [],
            tasks: [],
            workspaceRepositories: [],
          }}
          matches={buildPlanDetailMatches({
            linkedArtifacts: [],
            plan: null,
            planOutputChunks: [],
            planRunAuditRows: [],
            recentPlanRuns: [],
            ruleApplications: [],
            tagVocabulary: [],
            tasks: [],
            workspaceRepositories: [],
          })}
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
      linkedArtifacts: [],
      plan: mockPlan,
      planOutputChunks: [],
      planRunAuditRows: [],
      recentPlanRuns: [],
      ruleApplications: [],
      tagVocabulary: [],
      tasks: [mockTask],
      workspaceRepositories: [],
    };
    renderWithPlanDetailRouteData(
      <TooltipProvider>
        <PlanDetailSearchParamsProbe />
        <PlanDetail
          actionData={undefined}
          loaderData={loaderData}
          matches={buildPlanDetailMatches(loaderData)}
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
      linkedArtifacts: [],
      plan: mockPlan,
      planOutputChunks: [],
      planRunAuditRows: [],
      recentPlanRuns: [],
      ruleApplications: [],
      tagVocabulary: [],
      tasks: [],
      workspaceRepositories: [],
    };
    renderWithPlanDetailRouteData(
      <TooltipProvider>
        <PlanDetail
          actionData={undefined}
          loaderData={loaderData}
          matches={buildPlanDetailMatches(loaderData)}
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
