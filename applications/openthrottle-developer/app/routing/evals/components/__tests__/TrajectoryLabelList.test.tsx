import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { TRAJECTORY_LABEL_COPY } from '~/routing/evals/data/data.copy';
import { MOCK_OTHER_LABEL } from '~/routing/evals/data/mock.trajectory';
import { renderEvals } from '~/routing/evals/testing/render-evals';

import { TrajectoryLabelList } from '../TrajectoryLabelList';

describe('TrajectoryLabelList Component', () => {
  test('says when no one else has labelled', () => {
    const component = renderEvals(<TrajectoryLabelList labels={[]} />);

    expect(
      component.getByText(TRAJECTORY_LABEL_COPY.noOtherLabels),
    ).toBeInTheDocument();
  });

  test('shows each rater with their verdict and note', () => {
    const component = renderEvals(
      <TrajectoryLabelList labels={[MOCK_OTHER_LABEL]} />,
    );
    const item = component.getByTestId('TrajectoryLabelListItem');

    expect(item).toHaveTextContent(MOCK_OTHER_LABEL.rater);
    expect(item).toHaveTextContent(TRAJECTORY_LABEL_COPY.pass);
    expect(item).toHaveTextContent(MOCK_OTHER_LABEL.note ?? '');
  });
});
