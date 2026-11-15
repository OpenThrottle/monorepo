import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { PlanTasksTableCellTitleProps } from '../PlanTasksTableCellTitle';
import { PlanTasksTableCellTitle } from '../PlanTasksTableCellTitle';

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
 * Coerces a partial mock to a target type without a type assertion. The
 * component only reads `row.original`, so the rest of the TanStack `Row` surface
 * is intentionally omitted.
 */
function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const createMockRow = (
  overrides: Partial<typeof mockTask> = {},
): PlanTasksTableCellTitleProps['row'] => {
  return asMock<PlanTasksTableCellTitleProps['row']>({
    original: {
      ...mockTask,
      ...overrides,
    },
  });
};

describe('PlanTasksTableCellTitle Component', () => {
  let component: RenderResult;
  let props: PlanTasksTableCellTitleProps;
  const renderComponent = (): void => {
    const Component = () => {
      return <PlanTasksTableCellTitle {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      row: createMockRow(),
    };

    renderComponent();
  });

  test('renders task title as a link to the task route', () => {
    const titleLink = component.getByRole('link', {
      name: /scroll to task: task title/i,
    });

    expect(titleLink).toHaveTextContent('Task title');
    expect(titleLink).toHaveAttribute('href', '/plans/plan-1/tasks/task-1');
  });

  test('omits the assignee, description and summary', () => {
    expect(component.queryByText(/assigned to/i)).not.toBeInTheDocument();
    expect(component.queryByText('Short description')).not.toBeInTheDocument();
    expect(component.queryByText('Short summary')).not.toBeInTheDocument();
  });

  test('folds category and requirements count into the title cell', () => {
    props = {
      row: createMockRow({
        category: 'implementation',
        requirementsJson: JSON.stringify(['a', 'b', 'c']),
      }),
    };

    component.unmount();
    renderComponent();

    expect(
      component.getByLabelText('Category: implementation'),
    ).toBeInTheDocument();
    expect(component.getByLabelText('3 requirements')).toHaveTextContent(
      '3 requirements',
    );
    // The metadata is part of the task link, so the whole cell is clickable.
    expect(
      component.getByRole('link', { name: /scroll to task: task title/i }),
    ).toContainElement(component.getByLabelText('Category: implementation'));
  });

  test('falls back to Untitled', () => {
    props = {
      row: createMockRow({ title: undefined }),
    };

    component.unmount();
    renderComponent();

    expect(
      component.getByRole('link', { name: /scroll to task: untitled/i }),
    ).toHaveTextContent('Untitled');
  });

  test('flags the task when a steer is pending', () => {
    expect(
      component.queryByTestId('PlanSteerPendingBadge'),
    ).not.toBeInTheDocument();

    props = { hasSteerPending: true, row: createMockRow() };
    component.unmount();
    renderComponent();

    expect(component.getByTestId('PlanSteerPendingBadge')).toBeInTheDocument();
  });
});
