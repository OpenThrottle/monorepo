import * as React from 'react';
import userEvent from '@testing-library/user-event';
import { Tabs, TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test } from 'vitest';
import { PlanTabTasks } from '../PlanTabTasks';
import { renderWithPlanDetailRouteData } from '~/routing/plans/testing/plan-detail-route-data';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';

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
    {
      plan: null,
      planOutputChunks: [],
      planRunAuditRows: [],
      recentPlanRuns: [],
      tasks,
    },
  );
}

describe('PlanTabTasks Component', () => {
  test('renders empty tasks state when there are no tasks', () => {
    const { getByRole } = renderTabTasks([]);

    expect(getByRole('heading', { name: 'No plans yet' })).toBeInTheDocument();
  });

  test('renders the list view by default', () => {
    const { getByText, getByTestId, queryByText } = renderTabTasks([mockTask]);

    expect(getByTestId('PlanTabTasks-view-toggle')).toBeInTheDocument();
    expect(getByTestId('PlanTaskItems')).toBeInTheDocument();
    expect(getByText('First task')).toBeInTheDocument();
    // Table-only column headers are absent in the list view.
    expect(queryByText('Title / Context')).not.toBeInTheDocument();
  });

  test('switches to the table view via the toggle', async () => {
    const user = userEvent.setup();
    const { getByLabelText, getByText, queryByTestId } = renderTabTasks([
      mockTask,
    ]);

    await user.click(getByLabelText('Table view'));

    expect(getByText('Title / Context')).toBeInTheDocument();
    expect(getByText('Status')).toBeInTheDocument();
    expect(queryByTestId('PlanTaskItems')).not.toBeInTheDocument();
  });

  test('shows step index derived from sorted list position', () => {
    const { getByLabelText } = renderTabTasks([
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

    expect(getByLabelText('Step 1')).toHaveTextContent('#1');
    expect(getByLabelText('Step 2')).toHaveTextContent('#2');
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
