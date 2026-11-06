import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { MOCK_SUBAGENT } from '~/routing/evals/data/mock.trajectory';
import { renderEvals } from '~/routing/evals/testing/render-evals';

import { TrajectorySubagent } from '../TrajectorySubagent';

describe('TrajectorySubagent Component', () => {
  test('is collapsed by default and renders its steps once opened', async () => {
    const user = userEvent.setup();
    const component = renderEvals(
      <TrajectorySubagent subagent={MOCK_SUBAGENT} />,
    );
    const trigger = component.getByRole('button', { expanded: false });

    expect(component.queryByTestId('TrajectoryStep')).not.toBeInTheDocument();

    await user.click(trigger);

    expect(component.getAllByTestId('TrajectoryStep')).toHaveLength(2);
  });
});
