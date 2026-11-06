import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { TRAJECTORY_VIEWER_COPY } from '~/routing/evals/data/data.copy';
import {
  MOCK_TRAJECTORY,
  MOCK_TRAJECTORY_SUMMARY,
} from '~/routing/evals/data/mock.trajectory';
import { renderEvals } from '~/routing/evals/testing/render-evals';

import { TrajectoryHeader } from '../TrajectoryHeader';

const TASK_HREF = '/plans/plan-1/tasks/task-1?tab=trajectories';

describe('TrajectoryHeader Component', () => {
  test('titles the run with the agent name and version from the document', () => {
    const component = renderEvals(
      <TrajectoryHeader
        summary={MOCK_TRAJECTORY_SUMMARY}
        taskHref={TASK_HREF}
        trajectory={MOCK_TRAJECTORY}
      />,
    );

    expect(
      component.getByRole('heading', { level: 1, name: 'claude-code 2.1.0' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: TRAJECTORY_VIEWER_COPY.backToTask }),
    ).toHaveAttribute('href', TASK_HREF);
  });

  test('falls back to the driver when the document could not be read', () => {
    const component = renderEvals(
      <TrajectoryHeader
        summary={MOCK_TRAJECTORY_SUMMARY}
        taskHref={TASK_HREF}
        trajectory={null}
      />,
    );

    expect(
      component.getByRole('heading', { level: 1, name: 'claude' }),
    ).toBeInTheDocument();
  });
});
