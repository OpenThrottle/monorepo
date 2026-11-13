import { cn } from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import * as React from 'react';

import { TELEMETRY_COVERAGE_COPY } from '~/routing/usage/data/data.telemetry-coverage-copy';

export interface UsageTelemetryCoverageCommandProps {
  readonly className?: string;
  readonly command: string;
  /** Short caption above the command; omit for a bare command line. */
  readonly label?: string;
}

export const UsageTelemetryCoverageCommand = (
  props: UsageTelemetryCoverageCommandProps,
): React.ReactElement => {
  const { className, command, label } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const caption = label ? (
    <p className="text-muted-foreground mb-1 text-xs">{label}</p>
  ) : null;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('mt-2', className)}
      data-testid="UsageTelemetryCoverageCommand"
    >
      {caption}
      <div className="flex min-w-0 items-center gap-2">
        <code className="bg-muted min-w-0 flex-1 overflow-x-auto rounded-md border px-3 py-1.5 text-xs whitespace-nowrap">
          {command}
        </code>
        <OpenThrottleClipboard
          className="text-primary hover:text-primary/90 shrink-0 text-xs"
          label={TELEMETRY_COVERAGE_COPY.copyLabel}
          text={command}
        />
      </div>
    </div>
  );
};
