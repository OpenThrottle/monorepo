import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { TaskDetailRoute } from '../TaskDetailRoute';
import type { TaskDetailRouteProps } from '../TaskDetailRoute';
import type { GetTaskByIdQuery } from '~/__generated__/graphql';
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

const buildProps = (
  task: NonNullable<GetTaskByIdQuery['task']> = mockTask,
): TaskDetailRouteProps => ({
  loaderData: {
    linkedArtifacts: [],
    plan: null,
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
    expect(component.getByText('Task: Test Task')).toBeInTheDocument();
    expect(component.getByTestId('PlanTaskToolbar')).toBeInTheDocument();
    expect(component.getByTestId('TaskDetails')).toBeInTheDocument();
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
});
