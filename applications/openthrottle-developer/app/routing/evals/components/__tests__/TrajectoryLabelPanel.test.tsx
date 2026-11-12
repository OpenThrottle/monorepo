import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { TRAJECTORY_LABEL_COPY } from '~/routing/evals/data/data.copy';
import {
  MOCK_MY_LABEL,
  MOCK_OTHER_LABEL,
} from '~/routing/evals/data/mock.trajectory';
import { renderEvals } from '~/routing/evals/testing/renderEvals';

import { TrajectoryLabelPanel } from '../TrajectoryLabelPanel';

describe('TrajectoryLabelPanel Component', () => {
  test('shows your current label above the form and other raters below', () => {
    const component = renderEvals(
      <TrajectoryLabelPanel
        labels={{ mine: MOCK_MY_LABEL, others: [MOCK_OTHER_LABEL] }}
      />,
    );

    expect(component.getByTestId('TrajectoryCurrentLabel')).toHaveTextContent(
      TRAJECTORY_LABEL_COPY.fail,
    );
    expect(component.getByTestId('TrajectoryLabelForm')).toBeInTheDocument();
    expect(component.getAllByTestId('TrajectoryLabelListItem')).toHaveLength(1);
  });

  test('omits the current label when you have none', () => {
    const component = renderEvals(
      <TrajectoryLabelPanel labels={{ mine: null, others: [] }} />,
    );

    expect(
      component.queryByTestId('TrajectoryCurrentLabel'),
    ).not.toBeInTheDocument();
  });
});
