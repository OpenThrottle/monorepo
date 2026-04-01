import * as React from 'react';
import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanTasksTable } from '../PlanTasksTable';
import type { PlanTasksTableProps } from '../PlanTasksTable';

const mockTask: PlanTasksTableProps['tasks'][number] = {
  __typename: 'TaskObject',
  assignee: null,
  category: 'dev',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Task description text.',
  id: 'task-1',
  planId: 'plan-1',
  projectRelation: null,
  requirementsJson: '[]',
  status: 'PENDING',
  summary: 'Task summary.',
  title: 'First task',
  updatedAt: '2025-01-02T00:00:00Z',
};

describe('PlanTasksTable Component', () => {
  let component: RenderResult;
  let props: PlanTasksTableProps;

  beforeEach(() => {
    props = {
      tasks: [],
    };

    const Component = () => <PlanTasksTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render empty table shell', () => {
    expect(component.getByTestId('PlanTasksTable')).toBeInTheDocument();
    expect(component.getByText('No results.')).toBeInTheDocument();
  });

  test('renders column headers: Status, Title / Context, Category, Project, Requirements, Updated, Actions', () => {
    expect(component.getByText('Status')).toBeInTheDocument();
    expect(component.getByText('Title / Context')).toBeInTheDocument();
    expect(component.getByText('Category')).toBeInTheDocument();
    expect(component.getByText('Project')).toBeInTheDocument();
    expect(component.getByText('Requirements')).toBeInTheDocument();
    expect(component.getByText('Updated')).toBeInTheDocument();
    expect(component.getByText('Actions')).toBeInTheDocument();
  });

  test('shows No results when tasks is empty', () => {
    expect(component.getByText('No results.')).toBeInTheDocument();
  });

  describe('when tasks are provided', () => {
    beforeEach(() => {
      props = { tasks: [mockTask] };
      const Component = () => <PlanTasksTable {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('renders task title as link to plan task route', () => {
      const titleLink = component.getByRole('link', {
        name: /scroll to task: first task/i,
      });
      expect(titleLink).toHaveTextContent('First task');
      expect(titleLink.getAttribute('href')).toBe('/plans/plan-1/tasks/task-1');
    });

    test('renders task row with id for anchor', () => {
      const row = document.getElementById('task-task-1');
      expect(row).toBeInTheDocument();
    });

    test('renders description and summary', () => {
      expect(component.getByText('Task description text.')).toBeInTheDocument();
      expect(component.getByText('Task summary.')).toBeInTheDocument();
    });

    test('renders Actions link View', () => {
      const viewLink = component.getByRole('link', {
        name: /view task: first task/i,
      });
      expect(viewLink).toBeInTheDocument();
      expect(viewLink.getAttribute('href')).toContain('task-task-1');
    });

    test('shows requirements count as em dash when task has no requirements', () => {
      const row = document.getElementById('task-task-1');
      expect(row).toBeInTheDocument();
      const requirementsCell = row?.querySelector('.tabular-nums');
      expect(requirementsCell).toHaveTextContent('—');
    });

    test('renders relative updated date', () => {
      expect(component.getByText(/ago$/)).toBeInTheDocument();
    });
  });

  describe('when task has assignee', () => {
    const taskWithAssignee: PlanTasksTableProps['tasks'][number] = {
      ...mockTask,
      assignee: 'visormatt',
      id: 'task-assignee',
      title: 'Assigned task',
    };

    beforeEach(() => {
      props = { tasks: [taskWithAssignee] };
      const Component = () => <PlanTasksTable {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('shows assignee under title', () => {
      expect(component.getByText('Assigned to visormatt')).toBeInTheDocument();
    });
  });

  describe('when task has project relation', () => {
    const taskWithProject: PlanTasksTableProps['tasks'][number] = {
      ...mockTask,
      id: 'task-project',
      projectRelation: {
        __typename: 'ProjectObject',
        id: 'proj-1',
        name: 'My Project',
      },
      title: 'Project task',
    };

    beforeEach(() => {
      props = { tasks: [taskWithProject] };
      const Component = () => <PlanTasksTable {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('shows project name as link to project', () => {
      const link = component.getByRole('link', { name: 'My Project' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/projects/proj-1');
    });
  });

  describe('when task has requirements', () => {
    const taskWithRequirements: PlanTasksTableProps['tasks'][number] = {
      ...mockTask,
      id: 'task-2',
      requirementsJson:
        '["Requirement one", "Requirement two", "Requirement three"]',
      title: 'Task with requirements',
    };

    beforeEach(() => {
      props = { tasks: [taskWithRequirements] };
      const Component = () => <PlanTasksTable {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('shows requirements count in table', () => {
      expect(component.getByText('3')).toBeInTheDocument();
    });

    test('Details popover shows requirements list', async () => {
      const user = userEvent.setup();
      const detailsTrigger = component.getByRole('button', {
        name: /view full details for task: task with requirements/i,
      });
      await user.click(detailsTrigger);
      const popoverContent = component.getByRole('dialog');
      const popoverScope = within(popoverContent);
      expect(popoverScope.getByText('Requirements')).toBeInTheDocument();
      expect(popoverScope.getByText('Requirement one')).toBeInTheDocument();
      expect(popoverScope.getByText('Requirement two')).toBeInTheDocument();
      expect(popoverScope.getByText('Requirement three')).toBeInTheDocument();
    });
  });

  describe('when task has only requirements (no description or summary)', () => {
    const taskOnlyRequirements: PlanTasksTableProps['tasks'][number] = {
      ...mockTask,
      description: null,
      id: 'task-only-reqs',
      requirementsJson: '["Only req one", "Only req two"]',
      summary: null,
      title: 'Task with only requirements',
    };

    beforeEach(() => {
      props = { tasks: [taskOnlyRequirements] };
      const Component = () => <PlanTasksTable {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('shows Details trigger', () => {
      expect(
        component.getByRole('button', {
          name: /view full details for task: task with only requirements/i,
        }),
      ).toBeInTheDocument();
    });

    test('opening Details shows requirements list', async () => {
      const user = userEvent.setup();
      const detailsTrigger = component.getByRole('button', {
        name: /view full details for task: task with only requirements/i,
      });
      await user.click(detailsTrigger);
      const popoverContent = component.getByRole('dialog');
      const popoverScope = within(popoverContent);
      expect(popoverScope.getByText('Requirements')).toBeInTheDocument();
      expect(popoverScope.getByText('Only req one')).toBeInTheDocument();
      expect(popoverScope.getByText('Only req two')).toBeInTheDocument();
    });
  });

  describe('Details popover for full description and summary', () => {
    beforeEach(() => {
      props = { tasks: [mockTask] };
      const Component = () => <PlanTasksTable {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('shows Details trigger when task has description or summary', () => {
      expect(
        component.getByRole('button', {
          name: /view full details for task: first task/i,
        }),
      ).toBeInTheDocument();
      expect(component.getByText('Details')).toBeInTheDocument();
    });

    test('opens popover with full description and summary when Details is clicked', async () => {
      const user = userEvent.setup();
      const detailsTrigger = component.getByRole('button', {
        name: /view full details for task: first task/i,
      });
      await user.click(detailsTrigger);
      const popoverContent = component.getByRole('dialog');
      expect(popoverContent).toBeInTheDocument();
      const popoverScope = within(popoverContent);
      expect(popoverScope.getByText('Description')).toBeInTheDocument();
      expect(popoverScope.getByText('Summary')).toBeInTheDocument();
      expect(
        popoverScope.getByText('Task description text.'),
      ).toBeInTheDocument();
      expect(popoverScope.getByText('Task summary.')).toBeInTheDocument();
    });
  });

  describe('when task has no description or summary', () => {
    const taskNoDetails: PlanTasksTableProps['tasks'][number] = {
      ...mockTask,
      description: null,
      id: 'task-no-details',
      summary: null,
      title: 'Minimal task',
    };

    beforeEach(() => {
      props = { tasks: [taskNoDetails] };
      const Component = () => <PlanTasksTable {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('does not show Details trigger', () => {
      expect(component.queryByText('Details')).not.toBeInTheDocument();
      expect(
        component.queryByRole('button', { name: /view full details/i }),
      ).not.toBeInTheDocument();
    });
  });
});
