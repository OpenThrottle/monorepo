import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  TELEMETRY_COVERAGE_COMMANDS,
  TELEMETRY_COVERAGE_COPY,
} from '~/routing/usage/data/data.telemetry-coverage-copy';
import {
  buildTelemetryCoverage,
  buildTelemetryMachine,
  TELEMETRY_COVERAGE_NOW_ISO,
} from '~/routing/usage/utils/__tests__/telemetry-coverage-fixtures';

import { UsageTelemetryCoverage } from '../UsageTelemetryCoverage';

describe('UsageTelemetryCoverage Component', () => {
  describe('when no machine has reported', () => {
    test('explains the state and shows install, endpoint and doctor commands', () => {
      const component = render(
        <UsageTelemetryCoverage
          coverage={buildTelemetryCoverage([])}
          nowIso={TELEMETRY_COVERAGE_NOW_ISO}
        />,
      );

      expect(
        component.getByTestId('UsageTelemetryCoverageEmpty'),
      ).toHaveTextContent(TELEMETRY_COVERAGE_COPY.emptyTitle);
      expect(component.queryByRole('table')).not.toBeInTheDocument();

      for (const command of [
        TELEMETRY_COVERAGE_COMMANDS.pluginMarketplaceAdd,
        TELEMETRY_COVERAGE_COMMANDS.pluginInstall,
        TELEMETRY_COVERAGE_COMMANDS.envGraphqlUrl,
        TELEMETRY_COVERAGE_COMMANDS.envMcpAuthToken,
        TELEMETRY_COVERAGE_COMMANDS.doctor,
      ]) {
        expect(component.getByText(command)).toBeInTheDocument();
      }
    });
  });

  describe('when every machine is healthy', () => {
    test('renders the heading, the table and no warnings', () => {
      const component = render(
        <UsageTelemetryCoverage
          coverage={buildTelemetryCoverage([buildTelemetryMachine()])}
          nowIso={TELEMETRY_COVERAGE_NOW_ISO}
        />,
      );

      expect(
        component.getByRole('heading', {
          name: TELEMETRY_COVERAGE_COPY.heading,
        }),
      ).toBeInTheDocument();
      expect(component.getByRole('table')).toBeInTheDocument();
      expect(
        component.queryByTestId('UsageTelemetryCoverageWarnings'),
      ).not.toBeInTheDocument();
      expect(
        component.getByTestId('UsageTelemetryCoverageStatus'),
      ).toHaveTextContent(TELEMETRY_COVERAGE_COPY.statusOk);
    });
  });

  describe('when a machine has warnings', () => {
    test('puts the callouts above the table', () => {
      const component = render(
        <UsageTelemetryCoverage
          coverage={buildTelemetryCoverage([
            buildTelemetryMachine({
              warnings: [{ kind: 'MACHINE_SILENT', message: 'silent' }],
            }),
          ])}
          nowIso={TELEMETRY_COVERAGE_NOW_ISO}
        />,
      );
      const warnings = component.getByTestId('UsageTelemetryCoverageWarnings');
      const table = component.getByTestId('UsageTelemetryCoverageTable');

      expect(
        warnings.compareDocumentPosition(table) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  describe('when the coverage query failed', () => {
    test('shows an unavailable notice instead of a table', () => {
      const component = render(
        <UsageTelemetryCoverage
          coverage={null}
          nowIso={TELEMETRY_COVERAGE_NOW_ISO}
        />,
      );

      expect(component.getByRole('alert')).toHaveTextContent(
        TELEMETRY_COVERAGE_COPY.unavailableTitle,
      );
      expect(component.queryByRole('table')).not.toBeInTheDocument();
    });
  });
});
