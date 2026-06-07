import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { Tabs } from '@openthrottle/react-router-shadcn';
import { describe, expect, test } from 'vitest';
import { PlanTabRequirements } from '../PlanTabRequirements';
import type { PlanTabRequirementsProps } from '../PlanTabRequirements';
import type {
  PlanDetailsFragment,
  PlanTaskRowFragment,
} from '~/__generated__/graphql';

const mockPlan: PlanDetailsFragment = {
  __typename: 'PlanObject',
  assignee: 'visormatt',
  author: 'visormatt',
  category: 'feature',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Plan description',
  id: '0c2720a9-920f-4b16-865a-f803eb444e18',
  projectId: '11111111-1111-4111-8111-111111111111',
  projectRelation: {
    __typename: 'ProjectObject',
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Test Project',
  },
  status: 'IN_PROGRESS',
  summary: 'Plan summary',
  title: 'Test Plan',
  updatedAt: '2025-01-02T00:00:00Z',
};

const baseTask: PlanTaskRowFragment = {
  __typename: 'TaskObject',
  assignee: null,
  category: 'dev',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Task description text.',
  id: 'task-1',
  planId: mockPlan.id,
  projectRelation: null,
  requirementsJson: '[]',
  sortOrder: 1000,
  status: 'PENDING',
  summary: 'Task summary.',
  title: 'First task',
  updatedAt: '2025-01-02T00:00:00Z',
};

function renderRequirements(props: PlanTabRequirementsProps) {
  const Component = () => (
    <Tabs value="requirements">
      <PlanTabRequirements {...props} />
    </Tabs>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('PlanTabRequirements Component', () => {
  test('renders empty requirements state when tasks have no requirements', () => {
    const { getByRole } = renderRequirements({
      plan: mockPlan,
      tasks: [{ ...baseTask, requirementsJson: '[]' }],
    });

    expect(
      getByRole('heading', { name: 'No Requirements' }),
    ).toBeInTheDocument();
  });

  test('renders markdown list when requirements exist', () => {
    const { getByText } = renderRequirements({
      plan: mockPlan,
      tasks: [{ ...baseTask, requirementsJson: '["Ship feature"]' }],
    });

    expect(getByText('- Ship feature')).toBeInTheDocument();
  });
});
