import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { TaskDetails } from '../TaskDetails';
import type { TaskDetailsProps } from '../TaskDetails';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';

const mockTask: PlanTaskRowFragment = {
  __typename: 'TaskObject',
  assignee: 'visormatt',
  category: 'implementation',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Task description',
  id: 'task-1',
  planId: 'plan-1',
  projectRelation: {
    __typename: 'ProjectObject',
    id: 'proj-1',
    name: 'Test Project',
  },
  requirementsJson: '[]',
  status: 'PENDING',
  summary: 'Task summary',
  title: 'Test Task',
  updatedAt: '2025-01-02T00:00:00Z',
};

describe('TaskDetails Component', () => {
  let component: RenderResult;
  let props: TaskDetailsProps;

  beforeEach(() => {
    props = { planId: 'plan-1', task: mockTask };

    const Component = () => <TaskDetails {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render task details shell', () => {
    expect(component.getByTestId('TaskDetails')).toBeInTheDocument();
  });

  test('should show task title and metadata labels', () => {
    expect(component.getByText('Test Task')).toBeInTheDocument();
    expect(component.getByText('Assignee')).toBeInTheDocument();
    expect(component.getByText('Category')).toBeInTheDocument();
    expect(component.getByText('Plan')).toBeInTheDocument();
    expect(component.getByText('Project')).toBeInTheDocument();
    expect(component.getByText('Created')).toBeInTheDocument();
    expect(component.getByText('Updated')).toBeInTheDocument();
  });

  test('should show description and summary', () => {
    expect(component.getByText('Task description')).toBeInTheDocument();
    expect(component.getByText('Task summary')).toBeInTheDocument();
  });
});
