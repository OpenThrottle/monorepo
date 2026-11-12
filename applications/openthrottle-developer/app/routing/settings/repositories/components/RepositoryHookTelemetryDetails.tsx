import { Badge } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { REPOSITORY_HOOK_TELEMETRY_COPY } from '~/routing/settings/repositories/data/data.copy';
import type { HookTelemetryPresentation } from '~/routing/settings/repositories/utils/deriveHookTelemetry';

export interface RepositoryHookTelemetryDetailsProps {
  telemetry: HookTelemetryPresentation;
}

/**
 * @description The populated hook-telemetry panel: status badge, endpoint source,
 * summary, producers and the remediation with its command. Split out of
 * RepositoryHookTelemetry, which owns the not-inspected state.
 */
export const RepositoryHookTelemetryDetails = (
  props: RepositoryHookTelemetryDetailsProps,
): React.ReactElement => {
  const { telemetry } = props;

  // Hooks

  // Setup
  const hasEndpointSource = telemetry.endpointSource !== null;
  const hasProducers = telemetry.producers.length > 0;
  const hasRemediation = telemetry.remediation !== null;
  const hasCommand = telemetry.command !== null;

  // Handlers

  // Markup
  const endpointSource = (
    <span className="text-muted-foreground text-xs">
      {telemetry.endpointSource}
    </span>
  );
  const producers = (
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
  );
  const command = (
    <pre className="bg-muted overflow-x-auto rounded p-2 text-xs">
      <code>{telemetry.command}</code>
    </pre>
  );
  const remediation = (
    <div className="space-y-1">
      <p className="text-xs">{telemetry.remediation}</p>
      {hasCommand ? command : null}
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">
          {REPOSITORY_HOOK_TELEMETRY_COPY.heading}
        </span>
        <Badge variant={telemetry.tone}>{telemetry.label}</Badge>
        {hasEndpointSource ? endpointSource : null}
      </div>

      <p className="text-muted-foreground text-xs">{telemetry.summary}</p>

      {hasProducers ? producers : null}

      {hasRemediation ? remediation : null}
    </div>
  );
};
