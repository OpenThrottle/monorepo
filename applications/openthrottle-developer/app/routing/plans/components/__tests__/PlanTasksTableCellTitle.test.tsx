import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanTasksTableCellTitle } from '../PlanTasksTableCellTitle';
import type { PlanTasksTableCellTitleProps } from '../PlanTasksTableCellTitle';

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
): PlanTasksTableCellTitleProps['row'] =>
  asMock<PlanTasksTableCellTitleProps['row']>({
    original: {
      ...mockTask,
      ...overrides,
    },
  });

describe('PlanTasksTableCellTitle Component', () => {
  let component: RenderResult;
  let props: PlanTasksTableCellTitleProps;
  const renderComponent = (): void => {
    const Component = () => <PlanTasksTableCellTitle {...props} />;
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

  test('renders assignee and prefers the description over the summary', () => {
    expect(component.getByText('Assigned to visormatt')).toBeInTheDocument();
    expect(component.getByText('Short description')).toBeInTheDocument();
    expect(component.queryByText('Short summary')).not.toBeInTheDocument();
  });

  test('falls back to the summary when there is no description', () => {
    props = {
      row: createMockRow({ description: '   ' }),
    };

    component.unmount();
    renderComponent();

    expect(component.getByText('Short summary')).toBeInTheDocument();
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
  });

  test('falls back to Untitled and hides empty metadata', () => {
    props = {
      row: createMockRow({
        assignee: undefined,
        description: '   ',
        summary: undefined,
        title: undefined,
      }),
    };

    component.unmount();
    renderComponent();

    expect(
      component.getByRole('link', { name: /scroll to task: untitled/i }),
    ).toHaveTextContent('Untitled');
    expect(component.queryByText(/assigned to/i)).not.toBeInTheDocument();
    expect(component.queryByText('Short description')).not.toBeInTheDocument();
    expect(component.queryByText('Short summary')).not.toBeInTheDocument();
  });

  test('renders a long description in full, clamped by CSS only', () => {
    const longDescription = 'd'.repeat(130);

    props = {
      row: createMockRow({
        description: longDescription,
        summary: 's'.repeat(130),
      }),
    };

    component.unmount();
    renderComponent();

    // Markdown rendering replaced the JS truncation; overflow is now handled by
    // the `line-clamp-5` class rather than a slice plus a title tooltip.
    expect(component.getByText(longDescription)).not.toHaveAttribute('title');
  });

  test('renders a short description without tooltip attributes', () => {
    props = {
      row: createMockRow({
        description: 'Short details',
        summary: 'Short recap',
      }),
    };

    component.unmount();
    renderComponent();

    expect(component.getByText('Short details')).not.toHaveAttribute('title');
  });

  test('trims whitespace-only description and summary content', () => {
    props = {
      row: createMockRow({
        description: '   ',
        summary: '    ',
      }),
    };

    component.unmount();
    renderComponent();

    expect(component.queryByText('   ')).not.toBeInTheDocument();
    expect(component.queryByText('    ')).not.toBeInTheDocument();
  });
});
