import * as React from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { toast } from '@openthrottle/react-router-shadcn';
import { IS_BROWSER } from '@openthrottle/react-router-utils';
import {
  bucketRouteHttpStatus,
  classifyClientError,
  createIncidentReferenceId,
  incidentClassificationSummary,
  inferJavascriptErrorSubtype,
  isClientStackToggleEligible,
  isUsableRollbarClientToken,
  readSafeClientEnvironmentTags,
  type ClientErrorKind,
} from '../utils/client-error-diagnostics';
import {
  reportJavaScriptErrorToRollbar,
  reportRouteHttpErrorToRollbar,
} from '../utils/client-error-rollbar';

/** Return value of {@link useGlobalErrorBoundary}. */
export interface UseGlobalErrorBoundaryResult {
  readonly classificationSummary: string;
  readonly error: unknown;
  readonly incidentReferenceId: string;
  readonly kind: ClientErrorKind;
  readonly onClickRefresh: () => void;
  readonly onCopyIncidentDetails: () => Promise<void>;
  readonly onCopyReferenceId: () => Promise<void>;
  readonly stackToggleEligible: boolean;
}

/**
 * @description Owns the `GlobalErrorBoundary` behavior: classifies the raw
 * `useRouteError()` value, generates the per-incident support reference id,
 * exposes the copy/refresh handlers, and reports JavaScript and 5xx route
 * errors to Rollbar (deduped per incident).
 */
export const useGlobalErrorBoundary = (): UseGlobalErrorBoundaryResult => {
  // Hooks
  const error = useRouteError();
  const reportedRollbarKeyRef = React.useRef<string | null>(null);
  const reportedHttpRollbarKeyRef = React.useRef<string | null>(null);
  const [incidentReferenceId] = React.useState(createIncidentReferenceId);

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

  // 🔌 Short Circuit

  return {
    classificationSummary,
    error,
    incidentReferenceId,
    kind,
    onClickRefresh,
    onCopyIncidentDetails,
    onCopyReferenceId,
    stackToggleEligible,
  };
};
