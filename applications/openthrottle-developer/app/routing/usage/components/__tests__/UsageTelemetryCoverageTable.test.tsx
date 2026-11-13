import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { TELEMETRY_COVERAGE_COPY } from '~/routing/usage/data/data.telemetry-coverage-copy';
import {
  buildTelemetryMachine,
  TELEMETRY_COVERAGE_NOW_ISO,
  telemetryHoursAgo,
} from '~/routing/usage/utils/__tests__/telemetry-coverage-fixtures';

import { UsageTelemetryCoverageTable } from '../UsageTelemetryCoverageTable';

const renderTable = (
  machines: Parameters<typeof UsageTelemetryCoverageTable>[0]['machines'],
) => {
  return render(
    <UsageTelemetryCoverageTable
      machines={machines}
      nowIso={TELEMETRY_COVERAGE_NOW_ISO}
    />,
  );
};

describe('UsageTelemetryCoverageTable Component', () => {
  describe('with a healthy machine', () => {
    test('renders label, plugin version, repo count, legs and OK status', () => {
      const component = renderTable([buildTelemetryMachine()]);

      expect(component.getByRole('table')).toBeInTheDocument();
      expect(component.getByText('work-laptop')).toBeInTheDocument();
      expect(component.getByText('1.2.0')).toBeInTheDocument();
      expect(component.getByText('2')).toBeInTheDocument();
      expect(
        component.getByTestId('UsageTelemetryCoverageStatus'),
      ).toHaveTextContent(TELEMETRY_COVERAGE_COPY.statusOk);
      const legs = component.getAllByTestId('UsageTelemetryCoverageLeg');

      expect(legs.map((leg) => leg.textContent)).toEqual([
        'Repo hooks',
        'Plugin',
      ]);
    });
  });

  describe('with a label-less machine', () => {
    test('shows the first 8 characters of the id', () => {
      const component = renderTable([
        buildTelemetryMachine({ machineLabel: null }),
      ]);

      expect(component.getByText('01234567')).toBeInTheDocument();
    });
  });

  describe('with unknown or missing plugin state', () => {
    test('labels the plugin column accordingly', () => {
      const component = renderTable([
        buildTelemetryMachine({
          machineId: 'a1',
          marketplacePluginInstalled: false,
        }),
        buildTelemetryMachine({
          machineId: 'b2',
          marketplacePluginInstalled: null,
        }),
      ]);

      expect(
        component.getByText(TELEMETRY_COVERAGE_COPY.pluginNotInstalled),
      ).toBeInTheDocument();
      expect(
        component.getByText(TELEMETRY_COVERAGE_COPY.pluginUnknown),
      ).toBeInTheDocument();
    });
  });

  describe('with a buffer backlog', () => {
    test('shows total, oldest age and dead-letter count', () => {
      const component = renderTable([
        buildTelemetryMachine({
          buffer: {
            deadLetterCount: 3,
            oldestBufferedAt: telemetryHoursAgo(5),
            totalBuffered: 40,
          },
          warnings: [
            { kind: 'BUFFER_STALE', message: '' },
            { kind: 'BUFFER_GROWING', message: '' },
          ],
        }),
      ]);

      expect(
        component.getByText(TELEMETRY_COVERAGE_COPY.bufferOldest(40, '5h ago')),
      ).toBeInTheDocument();
      expect(
        component.getByText(TELEMETRY_COVERAGE_COPY.bufferDeadLetter(3)),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('UsageTelemetryCoverageStatus'),
      ).toHaveTextContent(TELEMETRY_COVERAGE_COPY.statusWarnings(2));
    });
  });
});
