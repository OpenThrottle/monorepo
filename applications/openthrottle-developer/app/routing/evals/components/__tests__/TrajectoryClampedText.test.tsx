import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderEvals } from '~/routing/evals/testing/renderEvals';

import { TrajectoryClampedText } from '../TrajectoryClampedText';

const LONG = Array.from({ length: 20 }, (_, index) => `line ${index + 1}`).join(
  '\n',
);

describe('TrajectoryClampedText Component', () => {
  describe('when the text fits', () => {
    test('renders it whole with no toggle', () => {
      const component = renderEvals(
        <TrajectoryClampedText maxLines={5} mono={false} text="short" />,
      );

      expect(component.getByText('short')).toBeInTheDocument();
      expect(component.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('when the text is longer than maxLines', () => {
    test('shows only the first lines until expanded, then collapses again', async () => {
      const user = userEvent.setup();
      const component = renderEvals(
        <TrajectoryClampedText maxLines={3} mono={true} text={LONG} />,
      );
      const toggle = component.getByRole('button');
      const content = component.getByTestId('TrajectoryClampedText');

      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(content).toHaveTextContent('line 3');
      expect(content).not.toHaveTextContent('line 20');

      await user.click(toggle);

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(content).toHaveTextContent('line 20');

      await user.click(toggle);

      expect(content).not.toHaveTextContent('line 20');
    });
  });
});
