import * as React from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button, Markdown, toast } from '@openthrottle/react-router-shadcn';
import {
  bucketRouteHttpStatus,
  classifyClientError,
  clientErrorKindLabel,
  createIncidentReferenceId,
  getLooseErrorStack,
  incidentClassificationSummary,
  inferJavascriptErrorSubtype,
  isClientStackToggleEligible,
  isUsableRollbarClientToken,
  javascriptErrorBoundaryHint,
  javascriptErrorBoundaryTitle,
  readSafeClientEnvironmentTags,
  routeHttpErrorSummary,
} from '../utils/client-error-diagnostics';
import {
  reportJavaScriptErrorToRollbar,
  reportRouteHttpErrorToRollbar,
} from '../utils/client-error-rollbar';
import { IS_BROWSER } from '@openthrottle/react-router-utils';

export interface GlobalErrorBoundaryProps {
  className?: string;
  /** @description Default target for “Back to Home” (e.g. mail app inbox). */
  homePath?: string;
}

/**
 * @link https://remix.run/docs/en/main/route/error-boundary
 */
export const GlobalErrorBoundary = (props: GlobalErrorBoundaryProps) => {
  const {
    className = 'flex flex-col h-full p-8 overflow-auto',
    homePath = '/',
  } = props;

  // Hooks
  const error = useRouteError();
  const reportedRollbarKeyRef = React.useRef<string | null>(null);
  const reportedHttpRollbarKeyRef = React.useRef<string | null>(null);
  const [incidentReferenceId] = React.useState(createIncidentReferenceId);
  const [showStack, setShowStack] = React.useState(false);

  // Setup
  const isJsError = error instanceof Error;

  const isRouteErr = isRouteErrorResponse(error);
  const kind = classifyClientError(error);
  const jsSubtype = isJsError ? inferJavascriptErrorSubtype(error) : null;
  const classificationSummary = incidentClassificationSummary({ error, kind });
  const stackToggleEligible = isClientStackToggleEligible();

  // Handlers
  const onClickRefresh = () => {
    window.location.reload();
  };

  const onCopyReferenceId = async () => {
    try {
      await navigator.clipboard.writeText(incidentReferenceId);
      toast.success('Reference id copied to clipboard');
    } catch {
      console.warn('Clipboard unavailable');
    }
  };

  const onCopyIncidentDetails = async () => {
    const crashReportingConfigured =
      IS_BROWSER && isUsableRollbarClientToken(window.env?.ROLLBAR_TOKEN);
    const envTags = IS_BROWSER ? readSafeClientEnvironmentTags() : null;
    const payload: Record<string, unknown> = {
      ...(envTags ?? {}),
      classificationSummary,
      crashReportingConfigured,
      errorKind: kind,
      incidentReferenceId,
    };

    if (isRouteErr) {
      payload.httpBucket = bucketRouteHttpStatus(error.status);
      payload.status = error.status;
      payload.statusText = error.statusText;
    }

    if (isJsError) {
      payload.javascriptSubtype = jsSubtype;
      payload.message = error.message;
    } else if (!isRouteErr && error != null) {
      payload.detail = String(error);
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));

      toast.success('Incident details copied to clipboard');
    } catch {
      console.warn('Clipboard unavailable');
    }
  };

  // Markup
  const renderReferencePanel = () => {
    const crashReportingConfigured =
      IS_BROWSER && isUsableRollbarClientToken(window.env?.ROLLBAR_TOKEN);

    return (
      <div className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-sm">
        <p className="font-medium text-foreground">Support reference</p>
        <p className="mt-1 font-mono text-xs break-all text-muted-foreground">
          {incidentReferenceId}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Classification: </span>
          {classificationSummary}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
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

  const renderClassification = () => {
    if (isRouteErr) {
      return (
        <p className="mt-2 text-sm text-muted-foreground">
          {routeHttpErrorSummary(error.status)}
        </p>
      );
    }

    return (
      <p className="mt-2 text-sm text-muted-foreground">
        {clientErrorKindLabel(kind)}
      </p>
    );
  };

  const renderActions = () => {
    return (
      <div className="flex flex-1 items-center justify-center gap-4 my-20 w-full">
        <Link className="ui-button secondary base" to={homePath}>
          Back to Home
        </Link>
        <Button onClick={onClickRefresh}>Refresh</Button>
      </div>
    );
  };

  // Life Cycle
  React.useEffect(() => {
    if (!isJsError) {
      return;
    }

    const key = `${incidentReferenceId}:${error.message}`;
    if (reportedRollbarKeyRef.current === key) {
      return;
    }

    reportedRollbarKeyRef.current = key;

    void reportJavaScriptErrorToRollbar(
      error,
      incidentReferenceId,
      kind,
      jsSubtype ?? undefined,
      classificationSummary,
    );
  }, [
    classificationSummary,
    error,
    incidentReferenceId,
    isJsError,
    jsSubtype,
    kind,
  ]);

  React.useEffect(() => {
    if (!isRouteErr || error.status < 500) {
      return;
    }

    const key = `${incidentReferenceId}:${error.status}:${error.statusText}`;
    if (reportedHttpRollbarKeyRef.current === key) {
      return;
    }

    reportedHttpRollbarKeyRef.current = key;

    void reportRouteHttpErrorToRollbar({
      classificationSummary,
      data: error.data,
      httpBucket: bucketRouteHttpStatus(error.status),
      incidentReferenceId,
      status: error.status,
      statusText: error.statusText,
    });
  }, [classificationSummary, error, incidentReferenceId, isRouteErr]);

  // 🔌 Short Circuits
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
    const subtype = inferJavascriptErrorSubtype(error);
    return (
      <div className={className}>
        <h1 className="text-title text-2xl">
          {javascriptErrorBoundaryTitle(subtype)}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {javascriptErrorBoundaryHint(subtype)}
        </p>
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

  const looseStack = getLooseErrorStack(error);

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
      {stackToggleEligible && looseStack ? (
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
              <Markdown content={looseStack} />
            </>
          ) : null}
        </div>
      ) : null}
      {renderActions()}
    </div>
  );
};
