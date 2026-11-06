import { Tabs } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { TASK_TRAJECTORIES_COPY } from '~/routing/evals/data/data.copy';
import { renderEvals } from '~/routing/evals/testing/render-evals';

import { TaskTrajectoriesTab } from '../TaskTrajectoriesTab';

const flags = vi.hoisted(() => {
  return { delta: false };
});

vi.mock('@openthrottle/react-router-utils', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-utils')>();

  return {
    ...actual,
    get FEATURE_DELTA_PREVIEW() {
      return flags.delta;
    },
  };
});

const renderTab = () => {
  return renderEvals(
    <Tabs value="trajectories">
      <TaskTrajectoriesTab trajectories={[]} />
    </Tabs>,
    {
      action: undefined,
      initialEntry: '/plans/plan-1/tasks/task-1',
      path: '/plans/:planId/tasks/:taskId',
    },
  );
};

describe('TaskTrajectoriesTab Component', () => {
  beforeEach(() => {
    flags.delta = false;
  });

  describe('when FEATURE_DELTA_PREVIEW is off', () => {
    test('renders nothing', () => {
      const component = renderTab();

      expect(
        component.queryByTestId('TaskTrajectoriesSection'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when FEATURE_DELTA_PREVIEW is on', () => {
    test('renders the trajectories section in its tab panel', () => {
      flags.delta = true;
      const component = renderTab();

      expect(component.getByRole('tabpanel')).toBeInTheDocument();
      expect(
        component.getByRole('heading', {
          name: TASK_TRAJECTORIES_COPY.heading,
        }),
      ).toBeInTheDocument();
    });
  });
});
