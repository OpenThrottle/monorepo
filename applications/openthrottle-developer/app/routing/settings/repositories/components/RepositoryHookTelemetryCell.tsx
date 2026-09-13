import { Badge } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { REPOSITORY_HOOK_TELEMETRY_COPY } from '~/routing/settings/repositories/data/data.copy';
import type { RepositoryCheckoutRow } from '~/routing/settings/repositories/data/types';
import { deriveHookTelemetry } from '~/routing/settings/repositories/utils/hook-telemetry';

export interface RepositoryHookTelemetryCellProps {
  row: RepositoryCheckoutRow;
}

export const RepositoryHookTelemetryCell = (
  props: RepositoryHookTelemetryCellProps,
): React.ReactElement => {
  const { row } = props;

  // Hooks

  // Setup
  const telemetry = deriveHookTelemetry(row.checkout?.inspection ?? null);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  // A worktree found on disk but never registered has no inspection at all, and
  // an older snapshot predates telemetry readiness. Neither is a failure — say
  // the answer is unknown rather than implying nothing records.
  if (telemetry === null) {
    return (
      <span
        className="text-muted-foreground text-xs"
        title={REPOSITORY_HOOK_TELEMETRY_COPY.notInspectedSummary}
      >
        {REPOSITORY_HOOK_TELEMETRY_COPY.notInspectedLabel}
      </span>
    );
  }

  return (
    <Badge title={telemetry.summary} variant={telemetry.tone}>
      {telemetry.label}
    </Badge>
  );
};
