import { isRouteErrorResponse } from 'react-router';

/**
 * @description Coarse error classification for route-level error boundary UX.
 */
export type ClientErrorKind = 'http' | 'javascript' | 'unknown';

/**
 * @description Maps thrown values to {@link ClientErrorKind} for titles and support payloads.
 */
export const classifyClientError = (error: unknown): ClientErrorKind => {
  if (isRouteErrorResponse(error)) {
    return 'http';
  }
  if (error instanceof Error) {
    return 'javascript';
  }
  return 'unknown';
};

/**
 * @description Short label for error classification shown to the user.
 */
export const clientErrorKindLabel = (kind: ClientErrorKind): string => {
  switch (kind) {
    case 'http':
      return 'HTTP / route error';
    case 'javascript':
      return 'Application error';
    case 'unknown':
      return 'Unexpected error';
  }
};

/**
 * @description Non-empty Rollbar post_client_item tokens should be reported; placeholders stay local-only.
 */
export const isUsableRollbarClientToken = (
  token: string | undefined,
): token is string => {
  if (token == null || token.length < 8) {
    return false;
  }
  if (/^x+$/i.test(token.trim())) {
    return false;
  }
  return true;
};

/**
 * @description Stable incident id for support tickets (generated once per error-boundary mount).
 */
export const createIncidentReferenceId = (): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `ot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

/**
 * @description Whether stack traces may be toggled in the UI (local/dev-like builds).
 */
export const isClientStackToggleEligible = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  const env = window.env;
  if (env == null) {
    return false;
  }
  return env.APP_ENV === 'development' || env.NODE_ENV === 'development';
};
