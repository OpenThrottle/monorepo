import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderEvals } from '~/routing/evals/testing/render-evals';

import { TrajectoryErrors } from '../TrajectoryErrors';

describe('TrajectoryErrors Component', () => {
  test('lists every run error in an alert', () => {
    const component = renderEvals(
      <TrajectoryErrors errors={['first failure', 'second failure']} />,
    );

    expect(component.getByRole('alert')).toBeInTheDocument();
    expect(component.getAllByRole('listitem')).toHaveLength(2);
  });
});
