import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { cleanup } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { beforeEach, describe, expect, test } from 'vitest';
import { PLAN_CHECKOUT_SELECTOR_COPY } from '~/routing/plans/data/data.copy';
import { PlanDetailRoute } from '../PlanDetailRoute';
import type { PlanDetailRouteProps } from '../PlanDetailRoute';
import { PlanRunConfigStoreProvider } from '../PlanRunConfigStoreProvider';
import {
  buildPlanDetailLoaderData,
  renderWithPlanDetailRouteData,
} from '~/routing/plans/testing/plan-detail-route-data';
import { WorkspaceEditorId } from '~/__generated__/graphql';

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
): PlanDetailRouteProps['loaderData'] =>
  buildPlanDetailLoaderData({
    tasks: [],
    ...overrides,
  });

const CHECKOUT_ID = '11111111-1111-4111-8111-111111111111';

/** Overloaded identity helper to launder a loose seed as the generated type. */
function asRepositories(value: unknown): [];
function asRepositories(value: unknown): unknown {
  return value;
}

const repositories = asRepositories([
  {
    checkouts: [
      {
        displayName: 'monorepo',
        filesystemPath: '/Users/me/monorepo',
        id: CHECKOUT_ID,
        inspection: { git: { currentBranch: 'main', defaultBranch: 'main' } },
        kind: 'primary',
        managed: false,
      },
    ],
    defaultBranch: null,
    id: 'repo-1',
    name: 'monorepo',
    normalizedRemoteUrl: null,
    projectId: null,
  },
]);

const renderRoute = (
  loaderData: PlanDetailRouteProps['loaderData'] = buildLoaderData(),
  planOverrides: Partial<PlanDetailRouteProps['plan']> = {},
  repositories: React.ComponentProps<
    typeof PlanRunConfigStoreProvider
  >['repositories'] = loaderData.workspaceRepositories,
): RenderResult => {
  const routePlan = { ...plan, ...planOverrides };

  return renderWithPlanDetailRouteData(
    <TooltipProvider>
      <PlanRunConfigStoreProvider plan={routePlan} repositories={repositories}>
        <PlanDetailRoute
          loaderData={loaderData}
          params={{ planId: 'plan-1' }}
          plan={routePlan}
        />
      </PlanRunConfigStoreProvider>
    </TooltipProvider>,
    loaderData,
  );
};

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

  // test('renders the toolbar', () => {
  //   expect(component.getByTestId('PlanToolbar')).toBeInTheDocument();
  // });

  // test('exposes the Details, Tasks, Output, and Configuration tabs', () => {
  //   expect(
  //     component.getByRole('tab', { name: /details/i }),
  //   ).toBeInTheDocument();
  //   expect(component.getByRole('tab', { name: /tasks/i })).toBeInTheDocument();
  //   expect(component.getByRole('tab', { name: /output/i })).toBeInTheDocument();
  //   expect(
  //     component.getByRole('tab', { name: /configuration/i }),
  //   ).toBeInTheDocument();
  // });

  test('shows the resolved-task count in the Tasks tab label', () => {
    expect(
      component.getByRole('tab', { name: /tasks \(0\/0\)/i }),
    ).toBeInTheDocument();
  });

  test('mounts the checkout picker once repositories resolve', async () => {
    // The suite's beforeEach already rendered a route into this document.
    cleanup();
    const component = renderRoute(
      buildLoaderData({ workspaceRepositories: Promise.resolve(repositories) }),
    );

    expect(
      await component.findByTestId('PlanCheckoutSelector'),
    ).toBeInTheDocument();
    // This plan's runConfigJson carries no workspace, which is exactly the
    // case the picker exists for: enabled, unselected, waiting for a choice.
    const trigger = component.getByTestId('ChatCheckoutSelector-trigger');
    expect(trigger).toBeEnabled();
    // Icon-only in this row, so the unselected state is announced rather than
    // printed — the placeholder rides the accessible name instead of the face.
    expect(trigger).toHaveAccessibleName(
      `Checkout: ${PLAN_CHECKOUT_SELECTOR_COPY.placeholder}`,
    );
  });

  // A plan with no workspace cannot be queued and its editor links stay inert,
  // so the row has to say why rather than render an unexplained dead control.
  test('disables the picker and names the fix when nothing is registered', async () => {
    cleanup();
    const component = renderRoute(
      buildLoaderData({ workspaceRepositories: Promise.resolve([]) }),
    );

    expect(
      await component.findByTestId('ChatCheckoutSelector-trigger'),
    ).toBeDisabled();
    expect(component.getByTestId('PlanCheckoutSelector')).toBeInTheDocument();
    expect(PLAN_CHECKOUT_SELECTOR_COPY.emptyRegistryHint).toContain('Settings');
  });
});

/**
 * The route resolves the editor deep-link folder from the run config's selected
 * checkout, which is a different value from the raw run-config
 * `workingDirectory` field. Passing the raw field left every editor button
 * disabled for plans that had a checkout but no explicit working directory —
 * i.e. every plan seeded from the MCP's cwd.
 */
describe('PlanDetailRoute editor deep links', () => {
  const CHECKOUT_ID = '0d8c58fe-602e-4f25-94c9-d50b6669c020';
  const REPOSITORY_ID = '08619f7c-7b11-4aa2-ae72-3f57445e1f96';
  const FILESYSTEM_PATH = '/Users/matt/Development/openthrottle';

  /** Overloaded identity helper to launder a loose seed as the generated type. */
  function asRepositories(
    value: unknown,
  ): Awaited<
    React.ComponentProps<typeof PlanRunConfigStoreProvider>['repositories']
  >;
  function asRepositories(value: unknown): unknown {
    return value;
  }

  const repositories = asRepositories([
    {
      checkouts: [
        {
          displayName: 'openthrottle',
          filesystemPath: FILESYSTEM_PATH,
          id: CHECKOUT_ID,
          inspection: { git: { currentBranch: 'main', defaultBranch: 'main' } },
          kind: 'primary',
          managed: false,
        },
      ],
      defaultBranch: 'main',
      id: REPOSITORY_ID,
      name: 'openthrottle',
      normalizedRemoteUrl: null,
      projectId: null,
    },
  ]);

  const runConfigJson = JSON.stringify({
    ralph: {
      debugCli: 'verbose',
      executionBackend: 'cursor',
      iterationTimeoutText: '',
      iterations: 10,
      model: 'auto',
      project: '',
      prompt: '/agents-ralph',
      promptFile: '',
      promptLayer: 'named',
      skipWorktreeSetup: false,
      worktreeBase: '',
      worktreeCli: 'named',
      worktreeName: '',
    },
    target: { mode: 'plan', taskId: '' },
    version: 1,
    workspace: {
      checkoutId: CHECKOUT_ID,
      repositoryId: REPOSITORY_ID,
      workingDirectory: '',
    },
  });

  test('enables the Claude Code link from the selected checkout path', async () => {
    const component = renderRoute(
      buildLoaderData({
        enabledEditors: Promise.resolve([WorkspaceEditorId.Claude]),
        workspaceRepositories: Promise.resolve([...repositories]),
      }),
      { runConfigJson },
      Promise.resolve(repositories),
    );

    const link = await component.findByRole('link', { name: 'Claude Code' });

    expect(link).toHaveAttribute(
      'href',
      `claude://code/new?folder=${encodeURIComponent(`${FILESYSTEM_PATH}/`)}&q=%2Fot-claude-loop%20plan-1`,
    );
  });
});
