import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub, useSearchParams, type UIMatch } from 'react-router';
import { describe, expect, test } from 'vitest';
import PlanDetail from '../plans.$planId._index';

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
    const Component = () => (
      <TooltipProvider>
        <PlanDetail
          actionData={undefined}
          loaderData={{
            plan: mockPlan,
            planOutputChunks: [],
            recentPlanRuns: [],
            tasks: [],
          }}
          matches={[] as UIMatch[]}
          params={{ planId: mockPlan.id }}
        />
      </TooltipProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    render(<RoutesStub initialEntries={['/?plansDetailTab=configuration']} />);

    await user.click(screen.getByRole('tab', { name: 'Configuration' }));

    await waitFor(() => {
      expect(
        screen.getByLabelText('Execution backend for this plan run'),
      ).toHaveTextContent('Claude Code CLI');
    });

    expect(screen.getByLabelText('Iteration count for --iterations')).toHaveValue(
      7,
    );
    expect(screen.getByLabelText('NX project name for --project')).toHaveValue(
      'packages/foo',
    );
    expect(
      screen.getByLabelText('Absolute path to workspace directory'),
    ).toHaveValue('/tmp/openthrottle-workspace');
  });
});
