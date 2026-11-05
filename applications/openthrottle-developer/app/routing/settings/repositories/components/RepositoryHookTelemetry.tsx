import * as React from 'react';

import type { RepositoryCheckoutFieldsFragment } from '~/__generated__/graphql';
import { RepositoryHookTelemetryDetails } from '~/routing/settings/repositories/components/RepositoryHookTelemetryDetails';
import { REPOSITORY_HOOK_TELEMETRY_COPY } from '~/routing/settings/repositories/data/data.copy';
import { deriveHookTelemetry } from '~/routing/settings/repositories/utils/hook-telemetry';

export interface RepositoryHookTelemetryProps {
  inspection: RepositoryCheckoutFieldsFragment['inspection'];
}

export const RepositoryHookTelemetry = (
  props: RepositoryHookTelemetryProps,
): React.ReactElement => {
  const { inspection } = props;

  // Hooks

  // Setup
  const telemetry = deriveHookTelemetry(inspection);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (telemetry === null) {
    return (
      <p className="text-muted-foreground text-xs">
        {REPOSITORY_HOOK_TELEMETRY_COPY.notInspectedSummary}
      </p>
    );
  }

  return <RepositoryHookTelemetryDetails telemetry={telemetry} />;
};
