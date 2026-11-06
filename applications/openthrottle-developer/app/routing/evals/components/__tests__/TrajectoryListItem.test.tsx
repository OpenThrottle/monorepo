import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  TASK_TRAJECTORIES_COPY,
  TRAJECTORY_SUMMARY_COPY,
} from '~/routing/evals/data/data.copy';
import {
  MOCK_TRAJECTORY_SUMMARY,
  MOCK_UNPRICED_SESSION_SUMMARY,
} from '~/routing/evals/data/mock.trajectory';
import { renderEvals } from '~/routing/evals/testing/render-evals';

import { TrajectoryListItem } from '../TrajectoryListItem';

const HREF = '/plans/plan-1/tasks/task-1/trajectories/trajectory-1';

const renderItem = (trajectory = MOCK_TRAJECTORY_SUMMARY) => {
  return renderEvals(
    <ul>
      <TrajectoryListItem href={HREF} trajectory={trajectory} />
    </ul>,
  );
};

describe('TrajectoryListItem Component', () => {
  test('links to the viewer', () => {
    const component = renderItem();

    expect(
      component.getByRole('link', { name: TASK_TRAJECTORIES_COPY.open }),
    ).toHaveAttribute('href', HREF);
  });

  test('shows a priced spawned run with its truncated badge', () => {
    const row = renderItem().getByTestId('TrajectoryListItem');

    expect(row).toHaveTextContent(TRAJECTORY_SUMMARY_COPY.sourceSpawned);
    expect(row).toHaveTextContent('$0.4213');
    expect(row).toHaveTextContent(TRAJECTORY_SUMMARY_COPY.truncated);
    expect(row).not.toHaveTextContent(TRAJECTORY_SUMMARY_COPY.incomplete);
  });

  test('shows an unpriced interactive session as incomplete', () => {
    const row = renderItem(MOCK_UNPRICED_SESSION_SUMMARY).getByTestId(
      'TrajectoryListItem',
    );

    expect(row).toHaveTextContent(TRAJECTORY_SUMMARY_COPY.sourceSessionUpload);
    expect(row).toHaveTextContent(TRAJECTORY_SUMMARY_COPY.unpriced);
    expect(row).toHaveTextContent(TRAJECTORY_SUMMARY_COPY.incomplete);
  });
});
