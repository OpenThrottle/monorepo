import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ProjectTasksTable } from '../ProjectTasksTable';
import type { ProjectTasksTableProps } from '../ProjectTasksTable';

type ProjectTaskRow = ProjectTasksTableProps['tasks'][number];

const mockTasks: ProjectTaskRow[] = [
  {
    __typename: 'TaskObject',
    assignee: 'dev@example.com',
    category: 'feature',
    createdAt: '2025-01-01T00:00:00Z',
    description: null,
    id: 'task-1',
    planId: 'plan-1',
    requirementsJson: '[]',
    summary: null,
    title: 'First task',
    updatedAt: '2025-01-02T00:00:00Z',
  },
  {
    __typename: 'TaskObject',
    assignee: null,
    category: null,
    createdAt: '2025-01-02T00:00:00Z',
    description: null,
    id: 'task-2',
    planId: 'plan-2',
    requirementsJson: '[]',
    summary: null,
    title: 'Second task',
    updatedAt: '2025-01-03T00:00:00Z',
  },
];

describe('ProjectTasksTable Component', () => {
  let component: RenderResult;
  let props: ProjectTasksTableProps;

  beforeEach(() => {
    props = { tasks: [] };

    const Component = () => <ProjectTasksTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders empty state when no tasks', () => {
    expect(component.getByTestId('ProjectTasksTable')).toBeInTheDocument();
    expect(component.getByRole('table')).toBeInTheDocument();
    expect(component.getByText('No results.')).toBeInTheDocument();
  });

  test('renders task rows when tasks provided', () => {
    props.tasks = mockTasks;
    const Component = () => <ProjectTasksTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component.rerender(<RoutesStub />);

    expect(component.getByText('First task')).toBeInTheDocument();
    expect(component.getByText('Second task')).toBeInTheDocument();
    expect(component.getByText('feature')).toBeInTheDocument();
    expect(component.getByText('dev@example.com')).toBeInTheDocument();
  });

  test('renders View plan link when task has planId', () => {
    props.tasks = mockTasks;
    const Component = () => <ProjectTasksTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component.rerender(<RoutesStub />);

    const viewPlanLinks = component.getAllByRole('link', { name: /View plan/ });
    expect(viewPlanLinks).toHaveLength(2);
    expect(viewPlanLinks[0]).toHaveAttribute('href', '/plans/plan-1');
    expect(viewPlanLinks[1]).toHaveAttribute('href', '/plans/plan-2');
  });
});
