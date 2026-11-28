import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { TRAJECTORY_VIEWER_COPY } from '~/routing/evals/data/copy';
import {
  MOCK_TRAJECTORY,
  MOCK_TRAJECTORY_SUMMARY,
} from '~/routing/evals/data/mock.trajectory';
import { renderEvals } from '~/routing/evals/testing/renderEvals';
import type { AtifTrajectory } from '~/routing/evals/types';

import { TrajectoryViewerRoute } from '../TrajectoryViewerRoute';

const renderViewer = (trajectory: AtifTrajectory | null) => {
  return renderEvals(
    <TrajectoryViewerRoute
      backHref="/plans/plan-1/tasks/task-1?tab=trajectories"
      backLabel={TRAJECTORY_VIEWER_COPY.backToTask}
      labels={{ mine: null, others: [] }}
      scoring={null}
      summary={MOCK_TRAJECTORY_SUMMARY}
      trajectory={trajectory}
    />,
  );
};

describe('TrajectoryViewerRoute Component', () => {
  test('renders header, run errors, timeline, final metrics and label panel', () => {
    const component = renderViewer(MOCK_TRAJECTORY);

    expect(component.getByTestId('TrajectoryHeader')).toBeInTheDocument();
    expect(component.getByTestId('TrajectoryErrors')).toBeInTheDocument();
    expect(component.getByTestId('TrajectoryTimeline')).toBeInTheDocument();
    expect(component.getByTestId('TrajectoryFinalMetrics')).toBeInTheDocument();
    expect(component.getByTestId('TrajectoryLabelPanel')).toBeInTheDocument();
  });

  test('shows the summary alone when the document could not be read', () => {
    const component = renderViewer(null);

    expect(
      component.getByText(TRAJECTORY_VIEWER_COPY.unreadable),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('TrajectoryTimeline'),
    ).not.toBeInTheDocument();
    expect(component.getByTestId('TrajectoryLabelPanel')).toBeInTheDocument();
  });

  test('omits the errors block when the run recorded none', () => {
    const component = renderViewer({ ...MOCK_TRAJECTORY, extra: undefined });

    expect(component.queryByTestId('TrajectoryErrors')).not.toBeInTheDocument();
  });
});
