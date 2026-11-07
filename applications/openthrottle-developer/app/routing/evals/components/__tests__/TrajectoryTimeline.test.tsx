import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { TRAJECTORY_STEP_BATCH_SIZE } from '~/routing/evals/config/defaults';
import { TRAJECTORY_TIMELINE_COPY } from '~/routing/evals/data/data.copy';
import {
  MOCK_LONG_TRAJECTORY,
  MOCK_TRAJECTORY,
} from '~/routing/evals/data/mock.trajectory';
import { renderEvals } from '~/routing/evals/testing/render-evals';
import { buildTrajectoryTimeline } from '~/routing/evals/utils/timeline';

import { TrajectoryTimeline } from '../TrajectoryTimeline';

describe('TrajectoryTimeline Component', () => {
  describe('a short trajectory', () => {
    test('renders every step and the subagents no call mentions', () => {
      const component = renderEvals(
        <TrajectoryTimeline
          timeline={buildTrajectoryTimeline(MOCK_TRAJECTORY)}
        />,
      );

      expect(component.getAllByTestId('TrajectoryStep')).toHaveLength(6);
      expect(
        component.queryByRole('button', {
          name: TRAJECTORY_TIMELINE_COPY.showMoreSteps,
        }),
      ).not.toBeInTheDocument();
      // Spawn under Agent, again under the hand-back, plus the orphan section.
      expect(component.getAllByTestId('TrajectorySubagent')).toHaveLength(3);
      expect(
        component.getByRole('heading', {
          name: TRAJECTORY_TIMELINE_COPY.subagentsHeading,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('a 600-step trajectory', () => {
    test('renders in batches until shown in full', async () => {
      const user = userEvent.setup();
      const component = renderEvals(
        <TrajectoryTimeline
          timeline={buildTrajectoryTimeline(MOCK_LONG_TRAJECTORY)}
        />,
      );

      expect(component.getAllByTestId('TrajectoryStep')).toHaveLength(
        TRAJECTORY_STEP_BATCH_SIZE,
      );

      await user.click(
        component.getByRole('button', {
          name: TRAJECTORY_TIMELINE_COPY.showMoreSteps,
        }),
      );

      expect(component.getAllByTestId('TrajectoryStep')).toHaveLength(
        TRAJECTORY_STEP_BATCH_SIZE * 2,
      );

      await user.click(
        component.getByRole('button', {
          name: TRAJECTORY_TIMELINE_COPY.showAllSteps,
        }),
      );

      expect(component.getAllByTestId('TrajectoryStep')).toHaveLength(600);
    });
  });

  describe('an empty trajectory', () => {
    test('says it has no steps', () => {
      const component = renderEvals(
        <TrajectoryTimeline timeline={{ steps: [], unplacedSubagents: [] }} />,
      );

      expect(
        component.getByText(TRAJECTORY_TIMELINE_COPY.noSteps),
      ).toBeInTheDocument();
    });
  });
});
