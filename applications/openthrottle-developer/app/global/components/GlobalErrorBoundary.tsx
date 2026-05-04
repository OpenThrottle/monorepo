import * as React from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button, Markdown } from '@openthrottle/react-router-shadcn';
import {
  classifyClientError,
  clientErrorKindLabel,
  createIncidentReferenceId,
  isClientStackToggleEligible,
} from '~/global/utils/client-error-diagnostics';
import { reportJavaScriptErrorToRollbar } from '~/global/utils/client-error-rollbar';

export interface GlobalErrorBoundaryProps {
  className?: string;
}

/**
 * @link https://remix.run/docs/en/main/route/error-boundary
 */
export const GlobalErrorBoundary = (props: GlobalErrorBoundaryProps) => {
  const { className = 'flex flex-col h-full p-8 overflow-auto' } = props;

  const error = useRouteError();

  const kind = classifyClientError(error);
  const isRouteErr = isRouteErrorResponse(error);
  const isJsError = error instanceof Error;

  const [incidentReferenceId] = React.useState(createIncidentReferenceId);
  const stackToggleEligible = isClientStackToggleEligible();
  const [showStack, setShowStack] = React.useState(stackToggleEligible);

  const reportedRollbarKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!isJsError) {
      return;
    }
    const key = `${incidentReferenceId}:${error.message}`;
    if (reportedRollbarKeyRef.current === key) {
      return;
    }
    reportedRollbarKeyRef.current = key;
    void reportJavaScriptErrorToRollbar(error, incidentReferenceId, kind);
  }, [error, incidentReferenceId, isJsError, kind]);

  const onClickRefresh = () => {
    window.location.reload();
  };

  const onCopyReferenceId = async () => {
    try {
      await navigator.clipboard.writeText(incidentReferenceId);
    } catch {
      console.warn('Clipboard unavailable');
    }
  };

  const onCopyIncidentDetails = async () => {
    const payload: Record<string, unknown> = {
      appVersion:
        typeof window !== 'undefined' ? window.env?.APP_VERSION : undefined,
      errorKind: kind,
      incidentReferenceId,
    };
    if (isRouteErr) {
      payload.status = error.status;
      payload.statusText = error.statusText;
    }
    if (isJsError) {
      payload.message = error.message;
    } else if (!isRouteErr && error != null) {
      payload.detail = String(error);
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    } catch {
      console.warn('Clipboard unavailable');
    }
  };

  const renderReferencePanel = () => {
    return (
      <div className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-sm">
        <p className="font-medium text-foreground">Support reference</p>
        <p className="mt-1 font-mono text-xs break-all text-muted-foreground">
          {incidentReferenceId}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Include this id when contacting support. Secrets such as the Rollbar
          token are never shown or copied from this screen.
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

  const renderClassification = () => {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        {clientErrorKindLabel(kind)}
      </p>
    );
  };

  const renderActions = () => {
    return (
      <div className="flex flex-1 items-center justify-center gap-4 my-20 w-full">
        <Link className="ui-button secondary base" to="/">
          Back to Home
        </Link>
        <Button onClick={onClickRefresh}>Refresh</Button>
      </div>
    );
  };

  if (isRouteErr) {
    return (
      <div className={className}>
        <h1 className="text-title">
          {error.status} {error.statusText}
        </h1>
        {renderClassification()}
        <Markdown className="mt-4" content={error.data} />
        {renderReferencePanel()}
        {renderActions()}
      </div>
    );
  }

  if (isJsError) {
    return (
      <div className={className}>
        <h1 className="text-title text-2xl">{clientErrorKindLabel(kind)}</h1>
        <p className="mt-4">{error.message}</p>
        {renderReferencePanel()}
        {stackToggleEligible ? (
          <div className="mt-6 space-y-2">
            <Button
              onClick={() => setShowStack((v) => !v)}
              type="button"
              variant="secondary"
            >
              {showStack ? 'Hide stack trace' : 'Show stack trace'}
            </Button>
            {showStack ? (
              <>
                <h2 className="text-subtitle my-4">Stack trace</h2>
                <Markdown content={error.stack} />
              </>
            ) : null}
          </div>
        ) : null}
        {renderActions()}
      </div>
    );
  }

  return (
    <div className={className}>
      <h1 className="text-xl">{clientErrorKindLabel(kind)}</h1>
      {renderClassification()}
      <p className="mt-4">
        Sorry we&apos;ve encountered an unexpected problem. Please try again
        later.
      </p>
      {error != null ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground break-all">
          {String(error)}
        </p>
      ) : null}
      {renderReferencePanel()}
      {renderActions()}
    </div>
  );
};
