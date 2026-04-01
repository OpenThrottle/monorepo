import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanTasksTableCellActions } from '../PlanTasksTableCellActions';
import type { PlanTasksTableCellActionsProps } from '../PlanTasksTableCellActions';

const mockTask = {
  __typename: 'TaskObject',
  assignee: 'visormatt',
  category: 'dev',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Short description',
  id: 'task-1',
  planId: 'plan-1',
  projectRelation: null,
  requirementsJson: '[]',
  status: 'PENDING',
  summary: 'Short summary',
  title: 'Task title',
  updatedAt: '2025-01-02T00:00:00Z',
};

const createMockRow = (
  overrides: Partial<typeof mockTask> = {},
): PlanTasksTableCellActionsProps['row'] =>
  ({
    original: {
      ...mockTask,
      ...overrides,
    },
  }) as PlanTasksTableCellActionsProps['row'];

describe('PlanTasksTableCellActions Component', () => {
  let component: RenderResult;
  let props: PlanTasksTableCellActionsProps;
  const renderComponent = (): void => {
    const Component = () => <PlanTasksTableCellActions {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      row: createMockRow(),
    };

    renderComponent();
  });

  test('renders View link with task anchor', () => {
    const viewLink = component.getByRole('link', {
      name: /view task: task title/i,
    });

    expect(viewLink).toHaveTextContent('View');
    expect(viewLink).toHaveAttribute('href', '/#task-task-1');
  });

  test('renders Details trigger when details are present', () => {
    expect(
      component.getByRole('button', {
        name: /view full details for task: task title/i,
      }),
    ).toBeInTheDocument();
  });

  test('hides Details trigger when description, summary, and requirements are empty', () => {
    props = {
      row: createMockRow({
        description: '   ',
        requirementsJson: '[]',
        summary: undefined,
      }),
    };

    component.unmount();
    renderComponent();

    expect(
      component.queryByRole('button', {
        name: /view full details for task: task title/i,
      }),
    ).not.toBeInTheDocument();
  });
});
