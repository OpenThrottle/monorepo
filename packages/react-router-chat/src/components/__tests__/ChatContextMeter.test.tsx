import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { ChatContextMeter } from '../ChatContextMeter';

describe('ChatContextMeter Component', () => {
  describe('when the backend reported no context data', () => {
    test('renders nothing without a window size', () => {
      const component = render(
        <ChatContextMeter usage={{ contextTokens: 10, totalTokens: 10 }} />,
      );

      expect(component.queryByRole('meter')).not.toBeInTheDocument();
    });

    test('renders nothing without an occupancy', () => {
      const component = render(
        <ChatContextMeter usage={{ contextWindowTokens: 200_000 }} />,
      );

      expect(component.queryByRole('meter')).not.toBeInTheDocument();
    });
  });

  describe('when both values are reported', () => {
    test('exposes the fill as an accessible meter', () => {
      const component = render(
        <ChatContextMeter
          usage={{ contextTokens: 84_000, contextWindowTokens: 200_000 }}
        />,
      );

      const meter = component.getByRole('meter');
      expect(meter).toHaveAttribute('aria-valuenow', '42');
      expect(meter).toHaveAttribute('aria-valuemin', '0');
      expect(meter).toHaveAttribute('aria-valuemax', '100');
      expect(meter).toHaveAccessibleName(
        'Context window: 84k of 200k tokens used (42%)',
      );
      expect(component.getByTestId('ChatContextMeter-fill')).toHaveStyle({
        width: '42%',
      });
    });

    test.each([
      [50_000, 'normal'],
      [150_000, 'warning'],
      [180_000, 'critical'],
    ])('uses the %s-token fill tone %s', (contextTokens, tone) => {
      const component = render(
        <ChatContextMeter
          usage={{ contextTokens, contextWindowTokens: 200_000 }}
        />,
      );

      expect(component.getByTestId('ChatContextMeter-fill')).toHaveAttribute(
        'data-tone',
        tone,
      );
    });
  });
});
