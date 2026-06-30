import * as React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getPublicEnv } from '@openthrottle/react-router-utils';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test } from 'vitest';
import { renderWithPlanDetailRouteData } from '~/routing/plans/testing/plan-detail-route-data';
import PlanDetail from '../plans.$planId._index';
import type { Route } from '@/app/routes/+types/plans.$planId._index';

type PlanDetailMatches = Route.ComponentProps['matches'];
type PlanDetailLoaderData = Route.ComponentProps['loaderData'];

/** Build a fully-typed `matches` tuple for the PlanDetail component (which ignores it). */
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

const planId = '7a293e25-e50d-4d4e-86a0-768b779ab0d9';

const storedRunConfigJson = JSON.stringify({
  ralph: {
    debugCli: 'omit',
    executionBackend: 'claude',
    iterationTimeoutText: '',
    iterations: 7,
    model: 'auto',
    project: 'packages/foo',
    prompt: '/agents/ralph',
    promptFile: '',
    promptLayer: 'named',
    skipWorktreeSetup: false,
    worktreeBase: '',
    worktreeCli: 'omit',
    worktreeName: '',
  },
  target: { mode: 'plan', taskId: '' },
  version: 1,
  workspace: { workingDirectory: '/tmp/openthrottle-workspace' },
});

const mockPlan = {
  __typename: 'PlanObject' as const,
  assignee: 'visormatt',
  author: 'visormatt',
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
  title: 'Test Plan',
  updatedAt: '2025-01-02T00:00:00Z',
};

describe('routes/plans.$planId._index run config hydration', () => {
  test('hydrates Configuration tab from plan.runConfigJson', async () => {
    const user = userEvent.setup();
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
          matches={buildPlanDetailMatches(loaderData)}
          params={{ planId: mockPlan.id }}
        />
      </TooltipProvider>,
      loaderData,
      { initialEntries: ['/?plansDetailTab=configuration'] },
    );

    await user.click(screen.getByRole('tab', { name: 'Configuration' }));

    await waitFor(() => {
      expect(
        screen.getByLabelText('Execution backend for this plan run'),
      ).toHaveTextContent('Claude Code CLI');
    });

    expect(
      screen.getByLabelText('Iteration count for --iterations'),
    ).toHaveValue(7);
    expect(screen.getByLabelText('NX project name for --project')).toHaveValue(
      'packages/foo',
    );
    expect(
      screen.getByLabelText('Absolute path to workspace directory'),
    ).toHaveValue('/tmp/openthrottle-workspace');
  });
});
