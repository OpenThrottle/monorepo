import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useLocation } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { PROJECT_PLAN_TASKS_COPY } from '~/routing/projects/data/data.copy';
import type { ProjectPlanTasksData } from '~/routing/projects/types';

import type { ProjectPlanRowProps } from '../ProjectPlanRow';
import { ProjectPlanRow } from '../ProjectPlanRow';

const PLAN_ID = '01a20175-9298-7f05-98f8-2e3080c7fa7f';

const LOADED: ProjectPlanTasksData = {
  kind: 'loaded',
  planId: PLAN_ID,
  tasks: [
    {
      __typename: 'TaskObject',
      id: 'task-1',
      sortOrder: 1000,
      status: 'COMPLETED',
      title: 'Write the route',
    },
  ],
};

describe('ProjectPlanRow Component', () => {
  let component: RenderResult;
  let props: ProjectPlanRowProps;
  let loaderCalls: number;
  let routeLoaderCalls: number;

  const toggle = (): HTMLElement => {
    return component.getByRole('button', {
      name: `${PROJECT_PLAN_TASKS_COPY.toggleAriaLabelPrefix} Ship it`,
    });
  };

  beforeEach(() => {
    loaderCalls = 0;
    routeLoaderCalls = 0;
    props = {
      actions: [],
      plan: {
        __typename: 'PlanObject',
        id: PLAN_ID,
        projectSortOrder: 1000,
        status: 'IN_PROGRESS',
        taskCount: 1,
        tasksCompletedCount: 1,
        title: 'Ship it',
      },
      position: 51,
    };

    const Component = () => {
      const location = useLocation();

      return (
        <ol>
          <ProjectPlanRow {...props} />
          <li data-testid="location">{location.search}</li>
        </ol>
      );
    };
    const RoutesStub = createRoutesStub([
      {
        Component,
        loader: () => {
          routeLoaderCalls += 1;
          return null;
        },
        path: '/',
      },
      {
        loader: () => {
          loaderCalls += 1;
          return LOADED;
        },
        path: '/resources/project-plan-tasks',
      },
    ]);

    component = render(<RoutesStub initialEntries={['/?page=2']} />);
  });

  test('starts collapsed without fetching tasks', async () => {
    await waitFor(() => {
      expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    });
    const regionId = toggle().getAttribute('aria-controls') ?? '';
    expect(document.getElementById(regionId)).not.toBeVisible();
    expect(loaderCalls).toBe(0);
  });

  describe('when expanded', () => {
    test('loads the tasks once and renders them', async () => {
      const user = userEvent.setup();
      await user.click(
        await component.findByRole('button', { name: /Tasks for/ }),
      );

      expect(toggle()).toHaveAttribute('aria-expanded', 'true');
      expect(
        await component.findByRole('link', { name: 'Write the route' }),
      ).toBeInTheDocument();
      expect(loaderCalls).toBe(1);
    });

    test('does not refetch on collapse and re-expand', async () => {
      const user = userEvent.setup();
      await user.click(
        await component.findByRole('button', { name: /Tasks for/ }),
      );
      await component.findByRole('link', { name: 'Write the route' });

      await user.click(toggle());
      expect(toggle()).toHaveAttribute('aria-expanded', 'false');
      await user.click(toggle());

      expect(
        component.getByRole('link', { name: 'Write the route' }),
      ).toBeInTheDocument();
      expect(loaderCalls).toBe(1);
    });

    test('leaves the page URL and route loader alone', async () => {
      const user = userEvent.setup();
      const initialRouteLoads = routeLoaderCalls;
      await user.click(
        await component.findByRole('button', { name: /Tasks for/ }),
      );
      await component.findByRole('link', { name: 'Write the route' });

      expect(component.getByTestId('location')).toHaveTextContent('?page=2');
      expect(routeLoaderCalls).toBe(initialRouteLoads);
    });
  });
});
