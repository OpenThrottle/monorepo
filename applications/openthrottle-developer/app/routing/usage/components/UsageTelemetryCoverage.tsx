import {
  Alert,
  AlertDescription,
  AlertTitle,
  cn,
} from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import * as React from 'react';

import type { GetUsageTelemetryCoverageQuery } from '~/__generated__/graphql';
import {
  TELEMETRY_COVERAGE_COMMANDS,
  TELEMETRY_COVERAGE_COPY,
} from '~/routing/usage/data/data.telemetry-coverage-copy';

import { UsageTelemetryCoverageCommand } from './UsageTelemetryCoverageCommand';
import { UsageTelemetryCoverageTable } from './UsageTelemetryCoverageTable';
import { UsageTelemetryCoverageWarnings } from './UsageTelemetryCoverageWarnings';

export interface UsageTelemetryCoverageProps {
  readonly className?: string;
  /** The `telemetryCoverage` result, or `null` when the query failed. */
  readonly coverage: GetUsageTelemetryCoverageQuery['telemetryCoverage'] | null;
  /** Loader clock (ISO), so relative labels match across SSR and hydration. */
  readonly nowIso: string;
}

export const UsageTelemetryCoverage = (
  props: UsageTelemetryCoverageProps,
): React.ReactElement => {
  const { className, coverage, nowIso } = props;

  // Hooks

  // Setup
  const copy = TELEMETRY_COVERAGE_COPY;
  const commands = TELEMETRY_COVERAGE_COMMANDS;

  // Handlers

  // Markup
  const heading = (
    <GlobalHeading className="mb-4" heading="h2" title={copy.heading} />
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (coverage === null) {
    return (
      <div
        className={cn('mt-8', className)}
        data-testid="UsageTelemetryCoverage"
      >
        {heading}
        <Alert variant="destructive">
          <AlertTitle>{copy.unavailableTitle}</AlertTitle>
          <AlertDescription>{copy.unavailableDescription}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (coverage.machines.length === 0) {
    return (
      <div
        className={cn('mt-8', className)}
        data-testid="UsageTelemetryCoverage"
      >
        {heading}
        <p className="text-muted-foreground mb-4 text-sm">
          {copy.intro(coverage.windowDays)}
        </p>
        <Alert data-testid="UsageTelemetryCoverageEmpty">
          <AlertTitle>{copy.emptyTitle}</AlertTitle>
          <AlertDescription>
            <p>{copy.emptyDescription}</p>
            <UsageTelemetryCoverageCommand
              command={commands.pluginMarketplaceAdd}
              label={copy.emptyCommandsLabel}
            />
            <UsageTelemetryCoverageCommand command={commands.pluginInstall} />
            <UsageTelemetryCoverageCommand
              command={commands.envGraphqlUrl}
              label={copy.emptyEnvLabel}
            />
            <UsageTelemetryCoverageCommand command={commands.envMcpAuthToken} />
            <UsageTelemetryCoverageCommand
              command={commands.doctor}
              label={copy.emptyDoctorLabel}
            />
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={cn('mt-8', className)} data-testid="UsageTelemetryCoverage">
      {heading}
      <p className="text-muted-foreground mb-4 text-sm">
        {copy.intro(coverage.windowDays)}
      </p>
      <UsageTelemetryCoverageWarnings
        currentPluginVersion={coverage.currentPluginVersion ?? null}
        machines={coverage.machines}
        nowIso={nowIso}
      />
      <UsageTelemetryCoverageTable
        machines={coverage.machines}
        nowIso={nowIso}
      />
    </div>
  );
};
