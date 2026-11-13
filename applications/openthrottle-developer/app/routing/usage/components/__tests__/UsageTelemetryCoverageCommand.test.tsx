import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { TELEMETRY_COVERAGE_COPY } from '~/routing/usage/data/data.telemetry-coverage-copy';

import { UsageTelemetryCoverageCommand } from '../UsageTelemetryCoverageCommand';

describe('UsageTelemetryCoverageCommand Component', () => {
  test('renders the command and its caption', () => {
    const component = render(
      <UsageTelemetryCoverageCommand command="pnpm run x" label="Caption" />,
    );

    expect(
      component.getByTestId('UsageTelemetryCoverageCommand'),
    ).toBeInTheDocument();
    expect(component.getByText('pnpm run x')).toBeInTheDocument();
    expect(component.getByText('Caption')).toBeInTheDocument();
  });

  test('omits the caption when no label is given', () => {
    const component = render(
      <UsageTelemetryCoverageCommand command="pnpm run x" />,
    );

    expect(component.queryByText('Caption')).not.toBeInTheDocument();
  });

  describe('when the Copy button is clicked', () => {
    test('writes the command to the clipboard', async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      });
      const component = render(
        <UsageTelemetryCoverageCommand command="pnpm run x" />,
      );

      await user.click(
        component.getByRole('button', {
          name: TELEMETRY_COVERAGE_COPY.copyLabel,
        }),
      );

      expect(writeText).toHaveBeenCalledWith('pnpm run x');
    });
  });
});
