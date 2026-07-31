import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import { IS_BROWSER } from '@openthrottle/react-router-utils';
import { isUsableRollbarClientToken } from '../utils/client-error-diagnostics';

export interface GlobalErrorBoundaryReferencePanelProps {
  readonly classificationSummary: string;
  readonly incidentReferenceId: string;
  readonly onCopyIncidentDetails: () => Promise<void>;
  readonly onCopyReferenceId: () => Promise<void>;
}

/**
 * @description The "Support reference" panel rendered on every
 * `GlobalErrorBoundary` branch: shows the per-incident reference id and
 * classification summary with copy actions for support workflows.
 */
export const GlobalErrorBoundaryReferencePanel = (
  props: GlobalErrorBoundaryReferencePanelProps,
): React.ReactElement => {
  const {
    classificationSummary,
    incidentReferenceId,
    onCopyIncidentDetails,
    onCopyReferenceId,
  } = props;

  // Hooks

  // Setup
  const crashReportingConfigured =
    IS_BROWSER && isUsableRollbarClientToken(window.env?.ROLLBAR_TOKEN);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="border-border bg-muted/40 mt-6 rounded-md border p-4 text-sm"
      data-testid="GlobalErrorBoundaryReferencePanel"
    >
      <p className="text-foreground font-medium">Support reference</p>
      <p className="text-muted-foreground mt-1 font-mono text-xs break-all">
        {incidentReferenceId}
      </p>
      <p className="text-muted-foreground mt-2 text-xs">
        <span className="text-foreground font-medium">Classification: </span>
        {classificationSummary}
      </p>
      <p className="text-muted-foreground mt-2 text-xs">
        Include this id when contacting support.{' '}
        {crashReportingConfigured
          ? 'When crash reporting is configured, this id is attached to the automated report so support can correlate your session.'
          : 'Crash reporting is not active in this environment (no usable client reporter token); the reference id still helps support match logs you send manually.'}{' '}
        Secrets such as the Rollbar token are never shown or copied from this
        screen.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={onCopyReferenceId} type="button" variant="secondary">
          Copy reference id
        </Button>
        <Button
          onClick={onCopyIncidentDetails}
          type="button"
          variant="secondary"
        >
          Copy incident details
        </Button>
      </div>
    </div>
  );
};
