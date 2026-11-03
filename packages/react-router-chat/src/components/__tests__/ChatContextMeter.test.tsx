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
      expect(meter.getAttribute('aria-label')).toContain('84k');
      expect(meter.getAttribute('aria-label')).toContain('200k');
      expect(component.getByTestId('ChatContextMeter-fill')).toHaveStyle({
        width: '42%',
      });
    });

    test('marks a nearly full window as critical', () => {
      const component = render(
        <ChatContextMeter
          usage={{ contextTokens: 190_000, contextWindowTokens: 200_000 }}
        />,
      );

      expect(component.getByTestId('ChatContextMeter-fill')).toHaveAttribute(
        'data-tone',
        'critical',
      );
    });
  });
});
