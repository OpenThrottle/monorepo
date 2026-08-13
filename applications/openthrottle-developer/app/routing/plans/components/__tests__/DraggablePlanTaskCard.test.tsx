import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import { DraggablePlanTaskCard } from '../DraggablePlanTaskCard';
import type { DraggablePlanTaskCardProps } from '../DraggablePlanTaskCard';

const mockTask: PlanTaskRowFragment = {
  __typename: 'TaskObject',
  assignee: null,
  category: 'dev',
  createdAt: '2025-01-01T00:00:00Z',
  description: null,
  id: 'task-1',
  planId: 'plan-1',
  projectRelation: null,
  requirementsJson: '[]',
  sortOrder: 1000,
  status: 'PENDING',
  summary: null,
  title: 'Draggable task',
  updatedAt: '2025-01-02T00:00:00Z',
};

describe('DraggablePlanTaskCard Component', () => {
  let component: RenderResult;
  let props: DraggablePlanTaskCardProps;

  beforeEach(() => {
    props = {
      planId: 'plan-1',
      task: mockTask,
    };

    const Component = () => (
      <DndProvider backend={HTML5Backend}>
        <DraggablePlanTaskCard {...props} />
      </DndProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('renders the wrapped task card', () => {
    expect(component.getByTestId('PlanTaskCard-task-1')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /open task: draggable task/i }),
    ).toBeInTheDocument();
  });
});
