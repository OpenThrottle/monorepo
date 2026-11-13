import { formatRelativeChatTimestamp } from '@openthrottle/react-router-chat';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  cn,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { UsageTelemetryCoverageMachineFragment } from '~/__generated__/graphql';
import {
  TELEMETRY_COVERAGE_COMMANDS,
  TELEMETRY_COVERAGE_COPY,
  TELEMETRY_WARNING_KINDS,
} from '~/routing/usage/data/data.telemetry-coverage-copy';
import type { TelemetryCoverageWarningEntry } from '~/routing/usage/utils/telemetry-coverage';
import {
  groupTelemetryWarnings,
  machineDisplayName,
  telemetryWarningVariant,
} from '~/routing/usage/utils/telemetry-coverage';

import { UsageTelemetryCoverageCommand } from './UsageTelemetryCoverageCommand';

export interface UsageTelemetryCoverageWarningsProps {
  readonly className?: string;
  /** Plugin version the server ships, for the outdated-plugin message. */
  readonly currentPluginVersion: string | null;
  readonly machines: readonly UsageTelemetryCoverageMachineFragment[];
  /** Loader clock (ISO), so relative labels match across SSR and hydration. */
  readonly nowIso: string;
}

export const UsageTelemetryCoverageWarnings = (
  props: UsageTelemetryCoverageWarningsProps,
): React.ReactElement | null => {
  const { className, currentPluginVersion, machines, nowIso } = props;

  // Hooks

  // Setup
  const nowMs = new Date(nowIso).getTime();
  const warnings = groupTelemetryWarnings(machines);
  const copy = TELEMETRY_COVERAGE_COPY;

  // Handlers
  const relative = (iso: string): string => {
    return formatRelativeChatTimestamp(iso, nowMs);
  };

  const describe = (entry: TelemetryCoverageWarningEntry): string => {
    const { buffer, lastSeenAt, marketplacePluginVersion } = entry.machine;

    switch (entry.kind) {
      case TELEMETRY_WARNING_KINDS.BUFFER_GROWING:
        return copy.warningDescriptions.BUFFER_GROWING(buffer.totalBuffered);
      case TELEMETRY_WARNING_KINDS.BUFFER_STALE:
        return copy.warningDescriptions.BUFFER_STALE(
          relative(buffer.oldestBufferedAt ?? lastSeenAt),
        );
      case TELEMETRY_WARNING_KINDS.MACHINE_SILENT:
        return copy.warningDescriptions.MACHINE_SILENT(relative(lastSeenAt));
      case TELEMETRY_WARNING_KINDS.MANUAL_SESSIONS_UNCOVERED:
        return copy.warningDescriptions.MANUAL_SESSIONS_UNCOVERED;
      case TELEMETRY_WARNING_KINDS.PLUGIN_OUTDATED:
        return copy.warningDescriptions.PLUGIN_OUTDATED(
          marketplacePluginVersion ?? copy.pluginUnknown,
          currentPluginVersion ?? copy.pluginUnknown,
        );
      default:
        return entry.message;
    }
  };

  const title = (entry: TelemetryCoverageWarningEntry): string => {
    const name = machineDisplayName(entry.machine);

    switch (entry.kind) {
      case TELEMETRY_WARNING_KINDS.BUFFER_GROWING:
        return copy.warningTitles.BUFFER_GROWING(name);
      case TELEMETRY_WARNING_KINDS.BUFFER_STALE:
        return copy.warningTitles.BUFFER_STALE(name);
      case TELEMETRY_WARNING_KINDS.MACHINE_SILENT:
        return copy.warningTitles.MACHINE_SILENT(name);
      case TELEMETRY_WARNING_KINDS.MANUAL_SESSIONS_UNCOVERED:
        return copy.warningTitles.MANUAL_SESSIONS_UNCOVERED(name);
      case TELEMETRY_WARNING_KINDS.PLUGIN_OUTDATED:
        return copy.warningTitles.PLUGIN_OUTDATED(name);
      default:
        return copy.warningTitleUnknown(name, entry.kind);
    }
  };

  const commands = (
    entry: TelemetryCoverageWarningEntry,
  ): React.ReactElement | null => {
    const labels = copy.warningCommandsLabels;
    const deadLetterCount = entry.machine.buffer.deadLetterCount;

    switch (entry.kind) {
      case TELEMETRY_WARNING_KINDS.MANUAL_SESSIONS_UNCOVERED:
        return (
          <>
            <UsageTelemetryCoverageCommand
              command={TELEMETRY_COVERAGE_COMMANDS.pluginMarketplaceAdd}
              label={labels.pluginInstall}
            />
            <UsageTelemetryCoverageCommand
              command={TELEMETRY_COVERAGE_COMMANDS.pluginInstall}
            />
          </>
        );
      case TELEMETRY_WARNING_KINDS.PLUGIN_OUTDATED:
        return (
          <UsageTelemetryCoverageCommand
            command={TELEMETRY_COVERAGE_COMMANDS.pluginUpdate}
            label={labels.pluginUpdate}
          />
        );
      case TELEMETRY_WARNING_KINDS.BUFFER_GROWING:
      case TELEMETRY_WARNING_KINDS.BUFFER_STALE:
        return (
          <>
            <UsageTelemetryCoverageCommand
              command={TELEMETRY_COVERAGE_COMMANDS.drain}
              label={labels.drain}
            />
            {deadLetterCount > 0 && (
              <>
                <p className="mt-2 text-xs">
                  {copy.warningReplayHint(deadLetterCount)}
                </p>
                <UsageTelemetryCoverageCommand
                  command={TELEMETRY_COVERAGE_COMMANDS.drainReplayDeadLetter}
                  label={labels.drainReplayDeadLetter}
                />
              </>
            )}
          </>
        );
      default:
        return null;
    }
  };

  // Markup
  const doctorLine = (
    <p className="mt-3 text-xs">
      {copy.doctorPrefix} <code>{TELEMETRY_COVERAGE_COMMANDS.doctor}</code>{' '}
      {copy.doctorSuffix}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div
      className={cn('mb-4 flex flex-col gap-2', className)}
      data-testid="UsageTelemetryCoverageWarnings"
    >
      {warnings.map((entry) => (
        <Alert
          data-kind={entry.kind}
          data-testid="UsageTelemetryCoverageWarning"
          key={entry.key}
          variant={telemetryWarningVariant(entry.kind)}
        >
          <AlertTitle className="line-clamp-none">{title(entry)}</AlertTitle>
          <AlertDescription className="min-w-0 grid-cols-[minmax(0,1fr)] justify-items-stretch">
            <p>{describe(entry)}</p>
            {commands(entry)}
            {doctorLine}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};
