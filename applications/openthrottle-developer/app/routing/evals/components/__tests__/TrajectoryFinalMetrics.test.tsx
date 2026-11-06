import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { TRAJECTORY_SUMMARY_COPY } from '~/routing/evals/data/data.copy';
import { MOCK_TRAJECTORY } from '~/routing/evals/data/mock.trajectory';
import { renderEvals } from '~/routing/evals/testing/render-evals';

import { TrajectoryFinalMetrics } from '../TrajectoryFinalMetrics';

describe('TrajectoryFinalMetrics Component', () => {
  test('shows prompt tokens including cached, completion and cost', () => {
    const component = renderEvals(
      <TrajectoryFinalMetrics finalMetrics={MOCK_TRAJECTORY.final_metrics} />,
    );
    const block = component.getByTestId('TrajectoryFinalMetrics');

    expect(block).toHaveTextContent('12,400 (9,800 cached)');
    expect(block).toHaveTextContent('1,250');
    expect(block).toHaveTextContent('$0.4213');
  });

  test('reads a missing cost as unpriced, never $0', () => {
    const component = renderEvals(
      <TrajectoryFinalMetrics finalMetrics={{ total_prompt_tokens: 10 }} />,
    );
    const block = component.getByTestId('TrajectoryFinalMetrics');

    expect(block).toHaveTextContent(TRAJECTORY_SUMMARY_COPY.unpriced);
    expect(block).not.toHaveTextContent('$0');
  });
});
