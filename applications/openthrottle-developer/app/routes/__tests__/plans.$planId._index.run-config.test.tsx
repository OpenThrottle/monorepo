import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { getPublicEnv } from '@openthrottle/react-router-utils';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/plans.$planId._index';
import {
  buildPlanDetailLoaderData,
  renderWithPlanDetailRouteData,
} from '~/routing/plans/testing/plan-detail-route-data';

import PlanDetail from '../plans.$planId._index';

// The Configuration tab is behind FEATURE_BETA_PREVIEW, which is a frozen
// `false` under test; turn it on so the tab renders.
vi.mock('@openthrottle/react-router-utils', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@openthrottle/react-router-utils')
  >()),
  FEATURE_BETA_PREVIEW: true,
}));

type PlanDetailMatches = Route.ComponentProps['matches'];
type PlanDetailLoaderData = Route.ComponentProps['loaderData'];

/** Build a fully-typed `matches` tuple for the PlanDetail component (which ignores it). */
const buildPlanDetailMatches = (
  loaderData: PlanDetailLoaderData,
): PlanDetailMatches => {
  const rootData = {
    backgroundActivities: [],
    canonical: 'http://localhost/',
    chatDock: { collapsedGroupIds: [], isOpen: true },
    defaultEditor: null,
    env: getPublicEnv(),
    permissions: [],
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

const planId = '7a293e25-e50d-4d4e-86a0-768b779ab0d9';

const storedRunConfigJson = JSON.stringify({
  run: {
    debugCli: 'omit',
    driver: 'claude',
    model: 'auto',
    worktreeName: '',
  },
  target: { mode: 'plan', taskId: '' },
  version: 1,
  workspace: { workingDirectory: '/tmp/openthrottle-workspace' },
});

const mockPlan = {
  __typename: 'PlanObject' as const,
  afterHooks: [],
  assignee: 'visormatt',
  author: 'visormatt',
  beforeHooks: [],
  category: 'feature',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Plan description',
  id: planId,
  jobRunHooksJson: JSON.stringify({ hooks: [] }),
  projectId: 'proj-1',
  projectRelation: {
    __typename: 'ProjectObject' as const,
    id: 'proj-1',
    name: 'Test Project',
  },
  runConfigJson: storedRunConfigJson,
  status: 'IN_PROGRESS',
  summary: 'Plan summary',
  tags: [],
  title: 'Test Plan',
  updatedAt: '2025-01-02T00:00:00Z',
};

describe('routes/plans.$planId._index run config hydration', () => {
  test('hydrates Configuration tab from plan.runConfigJson', async () => {
    const user = userEvent.setup();
    const loaderData = buildPlanDetailLoaderData({
      plan: mockPlan,
      tasks: [],
    });
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
      { initialEntries: ['/?plansDetailTab=configuration'] },
    );

    await user.click(component.getByRole('tab', { name: 'Configuration' }));

    await waitFor(() => {
      expect(
        component.getByLabelText('Driver for this plan run'),
      ).toHaveTextContent('Claude Code CLI');
    });

    // Fields only the retired runner read are no longer shown.
    expect(
      component.queryByLabelText('Iteration count for --iterations'),
    ).not.toBeInTheDocument();
    expect(
      component.queryByLabelText('NX project name for --project'),
    ).not.toBeInTheDocument();
    expect(
      component.getByLabelText('Absolute path to workspace directory'),
    ).toHaveValue('/tmp/openthrottle-workspace');
  });
});
