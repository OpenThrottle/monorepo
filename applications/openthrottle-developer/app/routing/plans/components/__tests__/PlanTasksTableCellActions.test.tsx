import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import userEvent from '@testing-library/user-event';
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
  sortOrder: 1000,
  status: 'PENDING',
  summary: 'Short summary',
  title: 'Task title',
  updatedAt: '2025-01-02T00:00:00Z',
};

/**
 * @description Casts a partial mock to the target type without a type
 * assertion (the component only reads `row.original`).
 */
function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const createMockRow = (
  overrides: Partial<typeof mockTask> = {},
): PlanTasksTableCellActionsProps['row'] =>
  asMock<PlanTasksTableCellActionsProps['row']>({
    original: {
      ...mockTask,
      ...overrides,
    },
  });

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

  test('renders the actions trigger labelled with the task title', () => {
    expect(
      component.getByRole('button', { name: /task actions for task title/i }),
    ).toBeInTheDocument();
  });

  test('opens View task and Edit task links for the row task', async () => {
    const user = userEvent.setup();

    await user.click(
      component.getByRole('button', { name: /task actions for task title/i }),
    );

    expect(
      component.getByRole('menuitem', { name: /view task/i }),
    ).toHaveAttribute('href', '/plans/plan-1/tasks/task-1');
    expect(
      component.getByRole('menuitem', { name: /edit task/i }),
    ).toHaveAttribute('href', '/plans/plan-1/tasks/task-1/edit');
  });
});
