import { Badge } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { RepositoryCheckoutFieldsFragment } from '~/__generated__/graphql';
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

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">
          {REPOSITORY_HOOK_TELEMETRY_COPY.heading}
        </span>
        <Badge variant={telemetry.tone}>{telemetry.label}</Badge>
        {telemetry.endpointSource === null ? null : (
          <span className="text-muted-foreground text-xs">
            {telemetry.endpointSource}
          </span>
        )}
      </div>

      <p className="text-muted-foreground text-xs">{telemetry.summary}</p>

      {telemetry.producers.length === 0 ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {REPOSITORY_HOOK_TELEMETRY_COPY.producersLabel}
          </span>
          {telemetry.producers.map((producer) => (
            <Badge key={producer} variant="outline">
              {producer}
            </Badge>
          ))}
        </div>
      )}

      {telemetry.remediation === null ? null : (
        <div className="space-y-1">
          <p className="text-xs">{telemetry.remediation}</p>
          {telemetry.command === null ? null : (
            <pre className="bg-muted overflow-x-auto rounded p-2 text-xs">
              <code>{telemetry.command}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
