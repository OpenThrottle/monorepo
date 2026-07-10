import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanTasksColumn } from '../PlanTasksColumn';
import type { PlanTasksColumnProps } from '../PlanTasksColumn';

describe('PlanTasksColumn Component', () => {
  let props: PlanTasksColumnProps;

  describe('when empty', () => {
    beforeEach(() => {
      props = {
        children: null,
        columnId: 'pending',
        title: 'Pending',
      };

      const Component = () => <PlanTasksColumn {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      render(<RoutesStub />);
    });

    test('shows empty label when there are no task cards', () => {
      expect(screen.getByTestId('PlanTasksColumn-pending')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Pending' }),
      ).toBeInTheDocument();
      expect(screen.getByText('No tasks')).toBeInTheDocument();
    });

    test('exposes the column as a named region for screen readers', () => {
      const region = screen.getByRole('region', { name: 'Pending' });
      expect(region).toHaveAttribute(
        'aria-labelledby',
        'plan-tasks-column-title-pending',
      );
    });
  });

  describe('when children are provided', () => {
    beforeEach(() => {
      props = {
        children: <div data-testid="task-slot">Task card placeholder</div>,
        columnId: 'in_progress',
        title: 'In progress',
      };

      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Component = () => <PlanTasksColumn {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      render(<RoutesStub />);
    });

    test('renders children instead of the empty state', () => {
      expect(
        screen.getByTestId('PlanTasksColumn-in_progress'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('task-slot')).toHaveTextContent(
        'Task card placeholder',
      );
      expect(screen.queryByText('No tasks')).not.toBeInTheDocument();
    });
  });
});
