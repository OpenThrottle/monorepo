import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanTaskItem } from '../PlanTaskItem';
import type { PlanTaskItemProps } from '../PlanTaskItem';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';

const mockTask: PlanTaskRowFragment = {
  __typename: 'TaskObject',
  assignee: 'visormatt',
  category: 'dev',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Short description',
  id: 'task-1',
  planId: 'plan-1',
  projectRelation: null,
  requirementsJson: '[]',
  sortOrder: 1000,
  status: 'PENDING',
  summary: 'Short summary',
  title: 'Task title',
  updatedAt: '2025-01-02T00:00:00Z',
};

describe('PlanTaskItem Component', () => {
  let component: RenderResult;
  let props: PlanTaskItemProps;
  const renderComponent = (): void => {
    const Component = () => <PlanTaskItem {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  };

  beforeEach(() => {
    props = { step: 1, task: mockTask };

    renderComponent();
  });

  test('renders a status chip, step index, and the title link', () => {
    expect(component.getByTestId('PlanStatusChip')).toHaveAttribute(
      'title',
      'Pending',
    );
    expect(component.getByLabelText('Step 1')).toHaveTextContent('#1');

    const titleLink = component.getByRole('link', {
      name: /scroll to task: task title/i,
    });
    expect(titleLink).toHaveAttribute('href', '/plans/plan-1/tasks/task-1');
  });

  test('renders category, assignee, description, and summary metadata', () => {
    expect(component.getByText('dev')).toBeInTheDocument();
    expect(component.getByText('Assigned to visormatt')).toBeInTheDocument();
    expect(component.getByText('Short description')).toBeInTheDocument();
    expect(component.getByText('Short summary')).toBeInTheDocument();
  });

  test('renders a pluralized requirements count when present', () => {
    props = {
      step: 2,
      task: { ...mockTask, requirementsJson: JSON.stringify(['a', 'b']) },
    };

    component.unmount();
    renderComponent();

    expect(
      component.getByText('requirements', { exact: false }),
    ).toHaveTextContent('2 requirements');
  });

  test('hides empty metadata and falls back to Untitled', () => {
    props = {
      step: 3,
      task: {
        ...mockTask,
        assignee: null,
        category: null,
        description: null,
        requirementsJson: '[]',
        summary: null,
        title: '',
      },
    };

    component.unmount();
    renderComponent();

    expect(
      component.getByRole('link', { name: /scroll to task: untitled/i }),
    ).toHaveTextContent('Untitled');
    expect(component.queryByText('dev')).not.toBeInTheDocument();
    expect(component.queryByText(/assigned to/i)).not.toBeInTheDocument();
    expect(component.queryByText(/requirement/i)).not.toBeInTheDocument();
  });
});
