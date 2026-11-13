import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  TELEMETRY_COVERAGE_COMMANDS,
  TELEMETRY_COVERAGE_COPY,
} from '~/routing/usage/data/data.telemetry-coverage-copy';
import {
  buildTelemetryMachine,
  TELEMETRY_COVERAGE_NOW_ISO,
  telemetryHoursAgo,
} from '~/routing/usage/utils/__tests__/telemetry-coverage-fixtures';

import { UsageTelemetryCoverageWarnings } from '../UsageTelemetryCoverageWarnings';

type Machines = Parameters<
  typeof UsageTelemetryCoverageWarnings
>[0]['machines'];

const renderWarnings = (machines: Machines) => {
  return render(
    <UsageTelemetryCoverageWarnings
      currentPluginVersion="1.3.0"
      machines={machines}
      nowIso={TELEMETRY_COVERAGE_NOW_ISO}
    />,
  );
};

const withWarning = (
  kind: string,
  overrides: Parameters<typeof buildTelemetryMachine>[0] = {},
) => {
  return buildTelemetryMachine({
    warnings: [{ kind, message: `server message for ${kind}` }],
    ...overrides,
  });
};

const expectDoctorLine = (alert: HTMLElement): void => {
  expect(alert).toHaveTextContent(TELEMETRY_COVERAGE_COMMANDS.doctor);
  expect(alert).toHaveTextContent(TELEMETRY_COVERAGE_COPY.doctorSuffix);
};

describe('UsageTelemetryCoverageWarnings Component', () => {
  describe('with no warnings', () => {
    test('renders nothing', () => {
      const component = renderWarnings([buildTelemetryMachine()]);

      expect(
        component.queryByTestId('UsageTelemetryCoverageWarnings'),
      ).not.toBeInTheDocument();
    });
  });

  describe('MANUAL_SESSIONS_UNCOVERED', () => {
    test('shows the plugin install commands and the doctor line', () => {
      const component = renderWarnings([
        withWarning('MANUAL_SESSIONS_UNCOVERED', {
          marketplacePluginInstalled: false,
        }),
      ]);
      const alert = component.getByTestId('UsageTelemetryCoverageWarning');

      expect(alert).toHaveAttribute('data-kind', 'MANUAL_SESSIONS_UNCOVERED');
      expect(
        component.getByText(TELEMETRY_COVERAGE_COMMANDS.pluginMarketplaceAdd),
      ).toBeInTheDocument();
      expect(
        component.getByText(TELEMETRY_COVERAGE_COMMANDS.pluginInstall),
      ).toBeInTheDocument();
      expect(
        component.getAllByRole('button', {
          name: TELEMETRY_COVERAGE_COPY.copyLabel,
        }),
      ).toHaveLength(2);
      expectDoctorLine(alert);
    });
  });

  describe('PLUGIN_OUTDATED', () => {
    test('shows the update command and both versions', () => {
      const component = renderWarnings([
        withWarning('PLUGIN_OUTDATED', { marketplacePluginVersion: '1.0.0' }),
      ]);
      const alert = component.getByTestId('UsageTelemetryCoverageWarning');

      expect(
        component.getByText(TELEMETRY_COVERAGE_COMMANDS.pluginUpdate),
      ).toBeInTheDocument();
      expect(alert).toHaveTextContent(
        TELEMETRY_COVERAGE_COPY.warningDescriptions.PLUGIN_OUTDATED(
          '1.0.0',
          '1.3.0',
        ),
      );
      expectDoctorLine(alert);
    });
  });

  describe('BUFFER_STALE', () => {
    test('suggests the drain and leaves replay to DEAD_LETTERED', () => {
      const component = renderWarnings([
        withWarning('BUFFER_STALE', {
          buffer: {
            deadLetterCount: 4,
            oldestBufferedAt: telemetryHoursAgo(30),
            totalBuffered: 12,
          },
        }),
      ]);
      const alert = component.getByTestId('UsageTelemetryCoverageWarning');

      expect(
        component.getByText(TELEMETRY_COVERAGE_COMMANDS.drain),
      ).toBeInTheDocument();
      expect(
        component.queryByText(
          TELEMETRY_COVERAGE_COMMANDS.drainReplayDeadLetter,
        ),
      ).not.toBeInTheDocument();
      expect(alert).toHaveTextContent(
        TELEMETRY_COVERAGE_COPY.warningDescriptions.BUFFER_STALE('1d ago'),
      );
      expectDoctorLine(alert);
    });
  });

  describe('DEAD_LETTERED', () => {
    test('offers the replay command, the count and the doctor line', () => {
      const component = renderWarnings([
        withWarning('DEAD_LETTERED', {
          buffer: { deadLetterCount: 1300, totalBuffered: 0 },
        }),
      ]);
      const alert = component.getByTestId('UsageTelemetryCoverageWarning');

      expect(alert).toHaveAttribute('data-kind', 'DEAD_LETTERED');
      expect(
        component.getByText(TELEMETRY_COVERAGE_COMMANDS.drainReplayDeadLetter),
      ).toBeInTheDocument();
      expect(
        component.queryByText(TELEMETRY_COVERAGE_COMMANDS.drain),
      ).not.toBeInTheDocument();
      expect(alert).toHaveTextContent(
        TELEMETRY_COVERAGE_COPY.warningDescriptions.DEAD_LETTERED(1300),
      );
      expectDoctorLine(alert);
    });
  });

  describe('BUFFER_GROWING', () => {
    test('suggests the drain and reports the backlog size', () => {
      const component = renderWarnings([
        withWarning('BUFFER_GROWING', {
          buffer: {
            deadLetterCount: 0,
            oldestBufferedAt: telemetryHoursAgo(2),
            totalBuffered: 250,
          },
        }),
      ]);
      const alert = component.getByTestId('UsageTelemetryCoverageWarning');

      expect(
        component.getByText(TELEMETRY_COVERAGE_COMMANDS.drain),
      ).toBeInTheDocument();
      expect(alert).toHaveTextContent(
        TELEMETRY_COVERAGE_COPY.warningDescriptions.BUFFER_GROWING(250),
      );
      expectDoctorLine(alert);
    });
  });

  describe('MACHINE_SILENT', () => {
    test('says when the machine was last seen', () => {
      const component = renderWarnings([
        withWarning('MACHINE_SILENT', { lastSeenAt: telemetryHoursAgo(72) }),
      ]);
      const alert = component.getByTestId('UsageTelemetryCoverageWarning');

      expect(alert).toHaveTextContent(
        TELEMETRY_COVERAGE_COPY.warningDescriptions.MACHINE_SILENT('3d ago'),
      );
      expect(
        component.queryByRole('button', {
          name: TELEMETRY_COVERAGE_COPY.copyLabel,
        }),
      ).not.toBeInTheDocument();
      expectDoctorLine(alert);
    });
  });

  describe('an unknown kind', () => {
    test('falls back to the server message', () => {
      const component = renderWarnings([withWarning('SOMETHING_NEW')]);

      expect(
        component.getByText('server message for SOMETHING_NEW'),
      ).toBeInTheDocument();
    });
  });

  describe('with several warnings on one machine', () => {
    test('renders one callout per kind, not per duplicate', () => {
      const component = renderWarnings([
        buildTelemetryMachine({
          warnings: [
            { kind: 'MACHINE_SILENT', message: 'a' },
            { kind: 'MACHINE_SILENT', message: 'b' },
            { kind: 'BUFFER_GROWING', message: 'c' },
          ],
        }),
      ]);

      expect(
        component.getAllByTestId('UsageTelemetryCoverageWarning'),
      ).toHaveLength(2);
    });
  });
});
