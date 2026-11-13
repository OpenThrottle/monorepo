import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { TELEMETRY_COVERAGE_COPY } from '~/routing/usage/data/data.telemetry-coverage-copy';
import {
  buildTelemetryMachine,
  TELEMETRY_COVERAGE_NOW_ISO,
} from '~/routing/usage/utils/__tests__/telemetry-coverage-fixtures';

import { UsageTelemetryCoverageRowDetails } from '../UsageTelemetryCoverageRowDetails';

describe('UsageTelemetryCoverageRowDetails Component', () => {
  test('lists org/repo with per-leg last-seen and a no-remote row', async () => {
    const user = userEvent.setup();
    const machine = buildTelemetryMachine();
    const component = render(
      <UsageTelemetryCoverageRowDetails
        machine={machine}
        nowIso={TELEMETRY_COVERAGE_NOW_ISO}
      />,
    );

    await user.click(
      component.getByRole('button', {
        name: TELEMETRY_COVERAGE_COPY.detailsAriaLabel('work-laptop'),
      }),
    );

    expect(
      await component.findByText(
        'OpenThrottle/monorepo: Repo hooks 2h ago, Plugin 1d ago',
      ),
    ).toBeInTheDocument();
    expect(
      component.getByText(TELEMETRY_COVERAGE_COPY.detailsNoRemote),
    ).toBeInTheDocument();
  });

  test('says so when the machine reported no repos', async () => {
    const user = userEvent.setup();
    const component = render(
      <UsageTelemetryCoverageRowDetails
        machine={buildTelemetryMachine({ repos: [] })}
        nowIso={TELEMETRY_COVERAGE_NOW_ISO}
      />,
    );

    await user.click(component.getByRole('button'));

    expect(
      await component.findByText(TELEMETRY_COVERAGE_COPY.detailsNoRepos),
    ).toBeInTheDocument();
  });
});
