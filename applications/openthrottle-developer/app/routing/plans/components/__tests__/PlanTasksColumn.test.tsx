import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { PlanTasksColumnProps } from '../PlanTasksColumn';
import { PlanTasksColumn } from '../PlanTasksColumn';

describe('PlanTasksColumn Component', () => {
  let component: RenderResult;
  let props: PlanTasksColumnProps;

  describe('when empty', () => {
    beforeEach(() => {
      props = {
        children: null,
        columnId: 'pending',
        title: 'Pending',
      };

      const Component = () => {
        return <PlanTasksColumn {...props} />;
      };
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(<RoutesStub />);
    });

    test('shows empty label when there are no task cards', () => {
      expect(
        component.getByTestId('PlanTasksColumn-pending'),
      ).toBeInTheDocument();
      expect(
        component.getByRole('heading', { name: 'Pending' }),
      ).toBeInTheDocument();
      expect(component.getByText('No tasks')).toBeInTheDocument();
    });

    test('exposes the column as a named region for screen readers', () => {
      const region = component.getByRole('region', { name: 'Pending' });
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
      const Component = () => {
        return <PlanTasksColumn {...props} />;
      };
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(<RoutesStub />);
    });

    test('renders children instead of the empty state', () => {
      expect(
        component.getByTestId('PlanTasksColumn-in_progress'),
      ).toBeInTheDocument();
      expect(component.getByTestId('task-slot')).toHaveTextContent(
        'Task card placeholder',
      );
      expect(component.queryByText('No tasks')).not.toBeInTheDocument();
    });
  });
});
