import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { Tabs, TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test } from 'vitest';
import { PlanTabTasks } from '../PlanTabTasks';
import type { PlanTabTasksProps } from '../PlanTabTasks';
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
  status: 'PENDING',
  summary: 'Task summary.',
  title: 'First task',
  updatedAt: '2025-01-02T00:00:00Z',
};

function renderTabTasks(props: PlanTabTasksProps) {
  const Component = () => (
    <TooltipProvider>
      <Tabs value="tasks">
        <PlanTabTasks {...props} />
      </Tabs>
    </TooltipProvider>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('PlanTabTasks Component', () => {
  test('renders empty tasks state when there are no tasks', () => {
    const { getByRole } = renderTabTasks({ tasks: [] });

    expect(getByRole('heading', { name: 'No plans yet' })).toBeInTheDocument();
  });

  test('renders task table when tasks exist', () => {
    const { getByText } = renderTabTasks({ tasks: [mockTask] });

    expect(getByText('First task')).toBeInTheDocument();
    expect(getByText('Status')).toBeInTheDocument();
    expect(getByText('Title / Context')).toBeInTheDocument();
  });
});
