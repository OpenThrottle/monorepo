import { Button } from '@openthrottle/react-router-shadcn';
import { ROLLBAR_TOKEN } from '@openthrottle/react-router-utils';
import * as React from 'react';

import { GLOBAL_ERROR_BOUNDARY_COPY } from '../data/copy';
import { isUsableRollbarClientToken } from '../utils/client-error-diagnostics';

export interface GlobalErrorBoundaryReferencePanelProps {
  readonly classificationSummary: string;
  /** `null` until hydrated; the copy actions stay disabled until then. */
  readonly incidentReferenceId: string | null;
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
  // `ROLLBAR_TOKEN` resolves from `process.env` on the server and the
  // serialized `window.env` in the browser, so both renders agree.
  const crashReportingConfigured = isUsableRollbarClientToken(ROLLBAR_TOKEN);
  const hasReferenceId = incidentReferenceId !== null;
  const crashReportingCopy = crashReportingConfigured
    ? GLOBAL_ERROR_BOUNDARY_COPY.crashReporting.active
    : GLOBAL_ERROR_BOUNDARY_COPY.crashReporting.inactive;

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
        {incidentReferenceId ?? GLOBAL_ERROR_BOUNDARY_COPY.pendingReferenceId}
      </p>
      <p className="text-muted-foreground mt-2 text-xs">
        <span className="text-foreground font-medium">Classification: </span>
        {classificationSummary}
      </p>
      <p className="text-muted-foreground mt-2 text-xs">
        Include this id when contacting support. {crashReportingCopy} Secrets
        such as the Rollbar token are never shown or copied from this screen.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          disabled={!hasReferenceId}
          onClick={onCopyReferenceId}
          type="button"
          variant="secondary"
        >
          Copy reference id
        </Button>
        <Button
          disabled={!hasReferenceId}
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
