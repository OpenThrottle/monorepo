import * as React from 'react';
import { render, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { TaskDetails } from '../TaskDetails';
import type { TaskDetailsProps } from '../TaskDetails';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import { TASK_DETAIL_COPY } from '~/routing/plans/data/data.copy';

const mockTask: PlanTaskRowFragment = {
  __typename: 'TaskObject',
  assignee: 'visormatt',
  category: 'implementation',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Task description',
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
  title: 'Test Task',
  updatedAt: '2025-01-02T00:00:00Z',
};

const renderTaskDetails = (props: TaskDetailsProps): RenderResult => {
  const Component = (): React.ReactElement => <TaskDetails {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('TaskDetails Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderTaskDetails({ planId: 'plan-1', task: mockTask });
  });

  test('should render task details shell', () => {
    expect(component.getByTestId('TaskDetails')).toBeInTheDocument();
  });

  test('should show metadata labels', () => {
    expect(component.getByText('Assignee')).toBeInTheDocument();
    expect(component.getByText('Category')).toBeInTheDocument();
    expect(component.getByText('Plan')).toBeInTheDocument();
    expect(component.getByText('Project')).toBeInTheDocument();
    expect(component.getByText('Created')).toBeInTheDocument();
    expect(component.getByText('Updated')).toBeInTheDocument();
  });

  test('should show description and summary', async () => {
    // Description/summary render through MarkdownRenderer, which resolves its
    // output asynchronously — use findByText so the assertion waits (inside act)
    // for the rendered markdown rather than querying before it mounts.
    expect(await component.findByText('Task description')).toBeInTheDocument();
    expect(await component.findByText('Task summary')).toBeInTheDocument();
  });

  test('renders the empty-body copy when the task has no description or summary', () => {
    const emptyTask: PlanTaskRowFragment = {
      ...mockTask,
      description: null,
      summary: null,
    };
    const empty = renderTaskDetails({ planId: 'plan-1', task: emptyTask });
    // Scope to this render — the beforeEach also mounts a TaskDetails in body.
    const scoped = within(empty.container);

    expect(
      scoped.getByText(TASK_DETAIL_COPY.noDescription),
    ).toBeInTheDocument();
    // Status lives in the always-visible route header; the rail still shows Plan.
    expect(scoped.getByText('Plan')).toBeInTheDocument();
  });
});
