import { Tabs, TooltipProvider } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import { PLAN_TASKS_EMPTY_COPY } from '~/routing/plans/data/data.copy';
import {
  buildPlanDetailLoaderData,
  renderWithPlanDetailRouteData,
} from '~/routing/plans/testing/plan-detail-route-data';

import { PlanTabTasks } from '../PlanTabTasks';

const mockTask: PlanTaskRowFragment = {
  __typename: 'TaskObject',
  assignee: null,
  category: 'dev',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Task description text.',
  id: 'task-1',
  planId: '0c2720a9-920f-4b16-865a-f803eb444e18',
  projectRelation: null,
  requirementsJson: '[]',
  sortOrder: 1000,
  status: 'PENDING',
  summary: 'Task summary.',
  title: 'First task',
  updatedAt: '2025-01-02T00:00:00Z',
};

function renderTabTasks(tasks: PlanTaskRowFragment[]) {
  return renderWithPlanDetailRouteData(
    <TooltipProvider>
      <Tabs value="tasks">
        <PlanTabTasks />
      </Tabs>
    </TooltipProvider>,
    buildPlanDetailLoaderData({
      plan: null,
      tasks,
    }),
  );
}

describe('PlanTabTasks Component', () => {
  test('renders empty tasks state when there are no tasks', () => {
    const { getByRole } = renderTabTasks([]);

    expect(
      getByRole('heading', { name: PLAN_TASKS_EMPTY_COPY.title }),
    ).toBeInTheDocument();
  });

  test('renders the tasks table with no view toggle', () => {
    const { getByText, queryByTestId } = renderTabTasks([mockTask]);

    expect(getByText('Task Details')).toBeInTheDocument();
    expect(getByText('Status')).toBeInTheDocument();
    expect(getByText('First task')).toBeInTheDocument();

    expect(queryByTestId('PlanTabTasks-view-toggle')).not.toBeInTheDocument();
    expect(queryByTestId('PlanTaskItems')).not.toBeInTheDocument();
  });

  test('orders rows by sortOrder not input array order', () => {
    const { getAllByRole } = renderTabTasks([
      {
        ...mockTask,
        id: 'task-second',
        sortOrder: 2000,
        title: 'Second task',
      },
      {
        ...mockTask,
        id: 'task-first',
        sortOrder: 1000,
        title: 'First by order',
      },
    ]);

    const titleLinks = getAllByRole('link', { name: /scroll to task:/i });
    expect(titleLinks[0]).toHaveTextContent('First by order');
    expect(titleLinks[1]).toHaveTextContent('Second task');
  });

  describe('mobile card layout (below sm)', () => {
    test('applies the card layout classes to the table and each row', () => {
      const { container, getByText } = renderTabTasks([mockTask]);

      expect(container.querySelector('table')).toHaveClass(
        'max-sm:block',
        'max-sm:[&_thead]:hidden',
      );
      expect(getByText('First task').closest('tr')).toHaveClass(
        'max-sm:flex',
        'max-sm:relative',
        'max-sm:[&>td:nth-child(3)]:absolute',
      );
    });

    test('keeps the row anchor id used for in-page links', () => {
      const { getByText } = renderTabTasks([mockTask]);

      expect(getByText('First task').closest('tr')).toHaveAttribute(
        'id',
        'task-task-1',
      );
    });

    test('clamps the title to two lines and orders the category chip beside the status', () => {
      const { getByLabelText, getByText } = renderTabTasks([mockTask]);

      expect(getByText('First task').closest('h2')).toHaveClass('line-clamp-2');
      expect(getByLabelText('Category: dev')).toHaveClass('max-sm:order-2');
    });

    test('keeps the per-task actions menu inside its row', () => {
      const { getByTestId } = renderTabTasks([mockTask]);

      const menu = getByTestId('PlanTasksTableCellActions-task-1');
      expect(menu.closest('tr')).toHaveClass('max-sm:flex');
      expect(menu.closest('td')).not.toBeNull();
    });
  });
});
