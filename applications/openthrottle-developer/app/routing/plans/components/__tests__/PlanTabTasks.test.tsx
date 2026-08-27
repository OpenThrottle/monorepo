import * as React from 'react';
import { Tabs, TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test } from 'vitest';
import { PlanTabTasks } from '../PlanTabTasks';
import {
  buildPlanDetailLoaderData,
  renderWithPlanDetailRouteData,
} from '~/routing/plans/testing/plan-detail-route-data';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import { PLAN_TASKS_EMPTY_COPY } from '~/routing/plans/data/data.copy';

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
});
