import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { ProjectPlanTaskRowFragment } from '~/__generated__/graphql';
import { PROJECT_PLAN_TASKS_VISIBLE_LIMIT } from '~/routing/projects/config/projects.defaults';
import { PROJECT_PLAN_TASKS_COPY } from '~/routing/projects/data/data.copy';

import type { ProjectPlanTasksProps } from '../ProjectPlanTasks';
import { ProjectPlanTasks } from '../ProjectPlanTasks';

const PLAN_ID = 'plan-a';

const task = (index: number): ProjectPlanTaskRowFragment => {
  return {
    __typename: 'TaskObject',
    id: `task-${index}`,
    sortOrder: index * 1000,
    status: 'PENDING',
    title: `Task ${index}`,
  };
};

const tasksOf = (count: number): ProjectPlanTaskRowFragment[] => {
  return Array.from({ length: count }, (_, index) => task(index + 1));
};

describe('ProjectPlanTasks Component', () => {
  let component: RenderResult;
  let props: ProjectPlanTasksProps;
  let load: ReturnType<typeof vi.fn<() => void>>;

  const renderTasks = (): void => {
    const Component = () => {
      return <ProjectPlanTasks {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  };

  beforeEach(() => {
    load = vi.fn<() => void>();
  });

  describe('while loading', () => {
    test('renders a busy skeleton', () => {
      props = { planId: PLAN_ID, tasks: { load, state: 'loading' } };
      renderTasks();

      expect(component.getByTestId('ProjectPlanTasks-loading')).toHaveAttribute(
        'aria-busy',
        'true',
      );
    });
  });

  describe('on error', () => {
    test('shows an alert whose retry calls load', async () => {
      const user = userEvent.setup();
      props = {
        planId: PLAN_ID,
        tasks: { load, reason: 'request-failed', state: 'error' },
      };
      renderTasks();

      expect(component.getByRole('alert')).toBeInTheDocument();
      await user.click(
        component.getByRole('button', { name: PROJECT_PLAN_TASKS_COPY.retry }),
      );
      expect(load).toHaveBeenCalledTimes(1);
    });
  });

  describe('when loaded with no tasks', () => {
    test('renders the empty note', () => {
      props = { planId: PLAN_ID, tasks: { load, state: 'loaded', tasks: [] } };
      renderTasks();

      expect(
        component.getByTestId('ProjectPlanTasks-empty'),
      ).toBeInTheDocument();
      expect(component.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('when loaded with tasks', () => {
    test('links each task to its task page', () => {
      props = {
        planId: PLAN_ID,
        tasks: { load, state: 'loaded', tasks: tasksOf(2) },
      };
      renderTasks();

      expect(component.getAllByRole('listitem')).toHaveLength(2);
      expect(component.getByRole('link', { name: 'Task 1' })).toHaveAttribute(
        'href',
        `/plans/${PLAN_ID}/tasks/task-1`,
      );
      expect(component.queryByRole('button')).not.toBeInTheDocument();
    });

    test('caps long lists and reveals the rest on Show all', async () => {
      const user = userEvent.setup();
      const total = PROJECT_PLAN_TASKS_VISIBLE_LIMIT + 3;
      props = {
        planId: PLAN_ID,
        tasks: { load, state: 'loaded', tasks: tasksOf(total) },
      };
      renderTasks();

      expect(component.getAllByRole('listitem')).toHaveLength(
        PROJECT_PLAN_TASKS_VISIBLE_LIMIT,
      );

      await user.click(
        component.getByRole('button', {
          name: `${PROJECT_PLAN_TASKS_COPY.showAllPrefix} ${total} ${PROJECT_PLAN_TASKS_COPY.showAllSuffix}`,
        }),
      );

      expect(component.getAllByRole('listitem')).toHaveLength(total);

      await user.click(
        component.getByRole('button', {
          name: PROJECT_PLAN_TASKS_COPY.showFewer,
        }),
      );

      expect(component.getAllByRole('listitem')).toHaveLength(
        PROJECT_PLAN_TASKS_VISIBLE_LIMIT,
      );
    });
  });
});
