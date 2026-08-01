import * as React from 'react';
import { isRouteErrorResponse, Link } from 'react-router';
import { Button, Markdown } from '@openthrottle/react-router-shadcn';
import {
  clientErrorKindLabel,
  getLooseErrorStack,
  inferJavascriptErrorSubtype,
  javascriptErrorBoundaryHint,
  javascriptErrorBoundaryTitle,
  routeHttpErrorSummary,
} from '../utils/client-error-diagnostics';
import { useGlobalErrorBoundary } from '../hooks/useGlobalErrorBoundary';
import { GlobalErrorBoundaryReferencePanel } from './GlobalErrorBoundaryReferencePanel';
import { GlobalErrorBoundaryStackToggle } from './GlobalErrorBoundaryStackToggle';

export interface GlobalErrorBoundaryProps {
  className?: string;
  /** @description Default target for “Back to Home” (e.g. mail app inbox). */
  homePath?: string;
}

/**
 * @link https://remix.run/docs/en/main/route/error-boundary
 */
export const GlobalErrorBoundary = (
  props: GlobalErrorBoundaryProps,
): React.ReactElement => {
  const {
    className = 'flex flex-col h-full p-8 overflow-auto',
    homePath = '/',
  } = props;

  // Hooks
  const {
    classificationSummary,
    error,
    incidentReferenceId,
    kind,
    onClickRefresh,
    onCopyIncidentDetails,
    onCopyReferenceId,
    stackToggleEligible,
  } = useGlobalErrorBoundary();

  // Setup
  const isJsError = error instanceof Error;

  const isRouteErr = isRouteErrorResponse(error);

  // Handlers

  // Markup
  const referencePanel = (
    <GlobalErrorBoundaryReferencePanel
      classificationSummary={classificationSummary}
      incidentReferenceId={incidentReferenceId}
      onCopyIncidentDetails={onCopyIncidentDetails}
      onCopyReferenceId={onCopyReferenceId}
    />
  );

  const renderClassification = () => {
    if (isRouteErr) {
      return (
        <p className="text-muted-foreground mt-2 text-sm">
          {routeHttpErrorSummary(error.status)}
        </p>
      );
    }

    return (
      <p className="text-muted-foreground mt-2 text-sm">
        {clientErrorKindLabel(kind)}
      </p>
    );
  };

  const renderActions = () => {
    return (
      <div className="my-20 flex w-full flex-1 items-center justify-center gap-4">
        <Link className="ui-button secondary base" to={homePath}>
          Back to Home
        </Link>
        <Button onClick={onClickRefresh}>Refresh</Button>
      </div>
    );
  };

  // Life Cycle

  // 🔌 Short Circuit
  if (isRouteErr) {
    return (
      <div className={className}>
        <h1 className="text-title">
          {error.status} {error.statusText}
        </h1>
        {renderClassification()}
        <Markdown className="mt-4" content={error.data} />
        {referencePanel}
        {renderActions()}
      </div>
    );
  }

  if (isJsError) {
    const subtype = inferJavascriptErrorSubtype(error);
    return (
      <div className={className}>
        <h1 className="text-lg">{javascriptErrorBoundaryTitle(subtype)}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {javascriptErrorBoundaryHint(subtype)}
        </p>
        <p className="mt-4">{error.message}</p>
        {referencePanel}
        {stackToggleEligible ? (
          <GlobalErrorBoundaryStackToggle stack={error.stack} />
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
        <p className="text-muted-foreground mt-2 font-mono text-xs break-all">
          {String(error)}
        </p>
      ) : null}
      {referencePanel}
      {stackToggleEligible && looseStack ? (
        <GlobalErrorBoundaryStackToggle stack={looseStack} />
      ) : null}
      {renderActions()}
    </div>
  );
};
