import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanTaskCard } from '../PlanTaskCard';
import type { PlanTaskCardProps } from '../PlanTaskCard';

const mockTask: PlanTaskCardProps['task'] = {
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

describe('PlanTaskCard Component', () => {
  let props: PlanTaskCardProps;

  beforeEach(() => {
    props = {
      task: mockTask,
    };

    const Component = () => <PlanTaskCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    render(<RoutesStub />);
  });

  test('renders title link to the task route', () => {
    const titleLink = screen.getByRole('link', {
      name: /open task: first task/i,
    });
    expect(titleLink).toHaveAttribute('href', '/plans/plan-1/tasks/task-1');
  });

  test('renders View link to the in-page task anchor', () => {
    const viewLink = screen.getByRole('link', {
      name: /view task: first task/i,
    });
    expect(viewLink.getAttribute('href')).toMatch(/#task-task-1$/);
  });
});
