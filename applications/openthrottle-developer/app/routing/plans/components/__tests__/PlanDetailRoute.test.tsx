import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanDetailRoute } from '../PlanDetailRoute';
import type { PlanDetailRouteProps } from '../PlanDetailRoute';
import { PlanRunConfigStoreProvider } from '../PlanRunConfigStoreProvider';
import { renderWithPlanDetailRouteData } from '~/routing/plans/testing/plan-detail-route-data';

const plan: PlanDetailRouteProps['plan'] = {
  __typename: 'PlanObject',
  afterHooks: [],
  assignee: null,
  author: 'visormatt',
  beforeHooks: [],
  category: 'feature',
  createdAt: '2026-01-01T00:00:00Z',
  id: 'plan-1',
  jobRunHooksJson: '{"hooks":[]}',
  project: null,
  projectId: null,
  projectRelation: null,
  runConfigJson: '{}',
  status: 'PENDING',
  tags: [],
  title: 'Ship the issue-tracker UX',
  updatedAt: '2026-01-02T00:00:00Z',
};

const buildLoaderData = (
  overrides: Partial<PlanDetailRouteProps['loaderData']> = {},
): PlanDetailRouteProps['loaderData'] => ({
  linkedArtifacts: [],
  plan,
  planOutputChunks: [],
  planRunAuditRows: [],
  recentPlanRuns: [],
  ruleApplications: [],
  tagVocabulary: [],
  tasks: [],
  workspaceRepositories: [],
  ...overrides,
});

const renderRoute = (
  loaderData: PlanDetailRouteProps['loaderData'] = buildLoaderData(),
): RenderResult =>
  renderWithPlanDetailRouteData(
    <TooltipProvider>
      <PlanRunConfigStoreProvider plan={plan}>
        <PlanDetailRoute
          loaderData={loaderData}
          params={{ planId: 'plan-1' }}
          plan={plan}
        />
      </PlanRunConfigStoreProvider>
    </TooltipProvider>,
    loaderData,
  );

describe('PlanDetailRoute Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderRoute();
  });

  test('renders the plan header with the plan title', () => {
    expect(
      component.getByRole('heading', { name: 'Ship the issue-tracker UX' }),
    ).toBeInTheDocument();
  });

  test('renders the toolbar', () => {
    expect(component.getByTestId('PlanToolbar')).toBeInTheDocument();
  });

  test('exposes the Details, Tasks, Output, and Configuration tabs', () => {
    expect(
      component.getByRole('tab', { name: /details/i }),
    ).toBeInTheDocument();
    expect(component.getByRole('tab', { name: /tasks/i })).toBeInTheDocument();
    expect(component.getByRole('tab', { name: /output/i })).toBeInTheDocument();
    expect(
      component.getByRole('tab', { name: /configuration/i }),
    ).toBeInTheDocument();
  });

  test('shows the resolved-task count in the Tasks tab label', () => {
    expect(
      component.getByRole('tab', { name: /tasks \(0\/0\)/i }),
    ).toBeInTheDocument();
  });
});
