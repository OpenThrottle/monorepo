import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { TASK_TRAJECTORIES_COPY } from '~/routing/evals/data/data.copy';
import {
  MOCK_TRAJECTORY_SUMMARY,
  MOCK_UNPRICED_SESSION_SUMMARY,
} from '~/routing/evals/data/mock.trajectory';
import { renderEvals } from '~/routing/evals/testing/renderEvals';

import { TaskTrajectoriesSection } from '../TaskTrajectoriesSection';

describe('TaskTrajectoriesSection Component', () => {
  describe('with no trajectories', () => {
    test('shows one quiet empty line', () => {
      const component = renderEvals(
        <TaskTrajectoriesSection
          planId="plan-1"
          taskId="task-1"
          trajectories={[]}
        />,
      );

      expect(component.getByTestId('TaskTrajectoriesEmpty')).toHaveTextContent(
        TASK_TRAJECTORIES_COPY.empty,
      );
      expect(component.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });

  describe('with trajectories', () => {
    test('lists them newest first, each linking to its viewer', () => {
      const component = renderEvals(
        <TaskTrajectoriesSection
          planId="plan-1"
          taskId="task-1"
          trajectories={[
            MOCK_TRAJECTORY_SUMMARY,
            MOCK_UNPRICED_SESSION_SUMMARY,
          ]}
        />,
      );
      const hrefs = component
        .getAllByRole('link', { name: TASK_TRAJECTORIES_COPY.open })
        .map((link) => link.getAttribute('href'));

      expect(hrefs).toEqual([
        '/plans/plan-1/tasks/task-1/trajectories/trajectory-2',
        '/plans/plan-1/tasks/task-1/trajectories/trajectory-1',
      ]);
    });
  });
});
