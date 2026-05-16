import * as React from 'react';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanTasksTable } from '../PlanTasksTable';
import type { PlanTasksTableProps } from '../PlanTasksTable';
import { renderRoutesStub } from '~/testing/route-fixtures';

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

const renderPlanTasksTable = (tableProps: PlanTasksTableProps): RenderResult =>
  renderRoutesStub(
    <TooltipProvider>
      <PlanTasksTable {...tableProps} />
    </TooltipProvider>,
  );

describe('PlanTasksTable Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderPlanTasksTable({ tasks: [] });
  });

  test('shows empty state when tasks is empty', () => {
    expect(component.getByText('No plans yet')).toBeInTheDocument();
    expect(component.getByRole('link', { name: 'New plan' })).toHaveAttribute(
      'href',
      '/plans/create',
    );
  });

  test('renders column headers when tasks exist', () => {
    const withTasks = renderPlanTasksTable({ tasks: [mockTask] });

    expect(withTasks.getByTestId('PlanTasksTable')).toBeInTheDocument();
    expect(withTasks.getByText('Status')).toBeInTheDocument();
    expect(withTasks.getByText('Title / Context')).toBeInTheDocument();
    expect(withTasks.getByText('Category')).toBeInTheDocument();
    expect(withTasks.getByText('Project')).toBeInTheDocument();
    expect(withTasks.getByText('Requirements')).toBeInTheDocument();
    expect(withTasks.getByText('Updated')).toBeInTheDocument();
    expect(withTasks.getByText('Actions')).toBeInTheDocument();
  });

  describe('when tasks are provided', () => {
    beforeEach(() => {
      component = renderPlanTasksTable({ tasks: [mockTask] });
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
      component = renderPlanTasksTable({ tasks: [taskWithAssignee] });
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
      component = renderPlanTasksTable({ tasks: [taskWithProject] });
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
      component = renderPlanTasksTable({ tasks: [taskWithRequirements] });
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
      component = renderPlanTasksTable({ tasks: [taskOnlyRequirements] });
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
      component = renderPlanTasksTable({ tasks: [mockTask] });
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
      component = renderPlanTasksTable({ tasks: [taskNoDetails] });
    });

    test('does not show Details trigger', () => {
      expect(component.queryByText('Details')).not.toBeInTheDocument();
      expect(
        component.queryByRole('button', { name: /view full details/i }),
      ).not.toBeInTheDocument();
    });
  });
});
