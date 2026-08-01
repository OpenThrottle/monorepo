import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { TaskDetailRoute } from '../TaskDetailRoute';
import type { TaskDetailRouteProps } from '../TaskDetailRoute';
import type {
  GetPlanByIdQuery,
  GetTaskByIdQuery,
} from '~/__generated__/graphql';
import { renderRoutesStub } from '~/testing/route-fixtures';

const mockTask: NonNullable<GetTaskByIdQuery['task']> = {
  __typename: 'TaskObject',
  afterHooks: [],
  assignee: 'visormatt',
  beforeHooks: [],
  category: 'implementation',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Task description',
  hookRole: null,
  id: 'task-1',
  planId: 'plan-1',
  projectRelation: {
    __typename: 'ProjectObject',
    id: 'proj-1',
    name: 'Test Project',
  },
  requirementsJson: '[]',
  sortOrder: 1000,
  status: 'PENDING',
  summary: 'Task summary',
  tags: [],
  title: 'Test Task',
  updatedAt: '2025-01-02T00:00:00Z',
};

const buildPlan = (status: string): NonNullable<GetPlanByIdQuery['plan']> => ({
  __typename: 'PlanObject',
  afterHooks: [],
  assignee: null,
  author: 'visormatt',
  beforeHooks: [],
  category: 'feature',
  createdAt: '2025-01-01T00:00:00Z',
  description: null,
  id: 'plan-1',
  jobRunHooksJson: '{"hooks":[]}',
  project: null,
  projectId: null,
  runConfigJson: '{}',
  status,
  summary: null,
  tags: [],
  title: 'Parent Plan',
  updatedAt: '2025-01-02T00:00:00Z',
});

const buildProps = (
  task: NonNullable<GetTaskByIdQuery['task']> = mockTask,
  plan: GetPlanByIdQuery['plan'] = null,
): TaskDetailRouteProps => ({
  loaderData: {
    linkedArtifacts: [],
    plan,
    planOutputChunks: [],
    tagVocabulary: [],
    task,
  },
  params: { planId: 'plan-1', taskId: 'task-1' },
  task,
});

const renderRoute = (props: TaskDetailRouteProps): RenderResult =>
  renderRoutesStub(<TaskDetailRoute {...props} />);

describe('TaskDetailRoute Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderRoute(buildProps());
  });

  test('renders heading, toolbar, and the Details tab by default', () => {
    expect(
      component.getByRole('heading', { name: 'Test Task' }),
    ).toBeInTheDocument();
    expect(component.getByTestId('PlanTaskToolbar')).toBeInTheDocument();
    expect(component.getByTestId('TaskDetails')).toBeInTheDocument();
  });

  test('shows the task status chip and a Plan → Task breadcrumb', () => {
    // Scope to this render — the beforeEach also mounts a TaskDetailRoute in body.
    const scoped = within(
      renderRoute(buildProps(mockTask, buildPlan('PENDING'))).container,
    );

    // Status uses the shared PlanStatusBadge label (PENDING → "Pending"); it
    // renders in the header and again in the toolbar's status action.
    expect(
      scoped.getAllByTestId('PlanStatusBadge').length,
    ).toBeGreaterThanOrEqual(1);
    expect(scoped.getAllByText('Pending').length).toBeGreaterThanOrEqual(1);
    // Breadcrumb links back to the plans list and the parent plan.
    expect(scoped.getByRole('link', { name: 'Plans' })).toHaveAttribute(
      'href',
      '/plans',
    );
    expect(scoped.getByRole('link', { name: 'Parent Plan' })).toHaveAttribute(
      'href',
      '/plans/plan-1',
    );
  });

  test('exposes the Details, Output, Artifacts, and Hooks tabs', () => {
    expect(
      component.getByRole('tab', { name: /details/i }),
    ).toBeInTheDocument();
    expect(component.getByRole('tab', { name: /output/i })).toBeInTheDocument();
    expect(
      component.getByRole('tab', { name: /artifacts/i }),
    ).toBeInTheDocument();
    expect(component.getByRole('tab', { name: /hooks/i })).toBeInTheDocument();
  });

  test('switches to the Output tab and shows the empty state', async () => {
    const user = userEvent.setup();
    await user.click(component.getByRole('tab', { name: /output/i }));

    expect(
      await component.findByText('No task output yet'),
    ).toBeInTheDocument();
  });

  test('disables task Mark Complete and Promote when the parent plan run is active', () => {
    const running = within(
      renderRoute(buildProps(mockTask, buildPlan('IN_PROGRESS'))).container,
    );
    const toolbar = within(running.getByTestId('PlanTaskToolbar'));
    expect(
      toolbar.getByRole('button', { name: /mark complete/i }),
    ).toBeDisabled();
    expect(
      toolbar.getByRole('button', { name: /promote to plan/i }),
    ).toBeDisabled();
  });

  test('leaves task actions enabled when the parent plan is not running', () => {
    const idle = within(
      renderRoute(buildProps(mockTask, buildPlan('PENDING'))).container,
    );
    const toolbar = within(idle.getByTestId('PlanTaskToolbar'));
    expect(
      toolbar.getByRole('button', { name: /mark complete/i }),
    ).not.toBeDisabled();
    expect(
      toolbar.getByRole('button', { name: /promote to plan/i }),
    ).not.toBeDisabled();
  });
});
