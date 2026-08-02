import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PlanTaskItems } from '../PlanTaskItems';
import type { PlanTaskItemsProps } from '../PlanTaskItems';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import { PLAN_TASKS_EMPTY_COPY } from '~/routing/plans/data/data.copy';

const mockTask: PlanTaskRowFragment = {
  __typename: 'TaskObject',
  assignee: null,
  category: 'dev',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Task description text.',
  id: 'task-1',
  planId: 'plan-1',
  projectRelation: null,
  requirementsJson: '[]',
  sortOrder: 1000,
  status: 'PENDING',
  summary: 'Task summary.',
  title: 'First task',
  updatedAt: '2025-01-02T00:00:00Z',
};

function renderItems(props: PlanTaskItemsProps) {
  const Component = () => <PlanTaskItems {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('PlanTaskItems Component', () => {
  test('renders the empty state when there are no tasks', () => {
    const { getByRole, queryByTestId } = renderItems({ tasks: [] });

    expect(
      getByRole('heading', { name: PLAN_TASKS_EMPTY_COPY.title }),
    ).toBeInTheDocument();
    expect(queryByTestId('PlanTaskItems')).not.toBeInTheDocument();
  });

  test('renders one item per task ordered by sortOrder', () => {
    const { getAllByTestId, getAllByLabelText } = renderItems({
      tasks: [
        { ...mockTask, id: 'task-second', sortOrder: 2000, title: 'Second' },
        { ...mockTask, id: 'task-first', sortOrder: 1000, title: 'First' },
      ],
    });

    expect(getAllByTestId('PlanTaskItem')).toHaveLength(2);

    const steps = getAllByLabelText(/^Step \d+$/);
    expect(steps[0]).toHaveTextContent('#1');
    expect(steps[1]).toHaveTextContent('#2');

    const titleLinks = getAllByTestId('PlanTaskItem').map(
      (item) => item.querySelector('a')?.textContent,
    );
    expect(titleLinks).toEqual(['First', 'Second']);
  });
});
