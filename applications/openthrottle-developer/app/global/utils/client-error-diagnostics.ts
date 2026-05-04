import { isRouteErrorResponse } from 'react-router';

/**
 * @description Coarse error classification for route-level error boundary UX.
 */
export type ClientErrorKind = 'http' | 'javascript' | 'unknown';

/**
 * @description Finer JavaScript error buckets for support triage and Rollbar custom tags.
 */
export type JavascriptErrorSubtype =
  | 'chunk_load'
  | 'user_abort'
  | 'network'
  | 'generic';

const JAVASCRIPT_SUBTYPE = {
  chunk_load: 'chunk_load',
  generic: 'generic',
  network: 'network',
  user_abort: 'user_abort',
} as const satisfies Record<string, JavascriptErrorSubtype>;

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
 * @description Best-effort subtype for {@link Error} instances (chunk loads, aborts, fetch failures).
 */
export const inferJavascriptErrorSubtype = (
  error: Error,
): JavascriptErrorSubtype => {
  const name = error.name;
  const message = error.message;
  if (
    name === 'ChunkLoadError' ||
    /chunk load failed|dynamically imported module|importing a module script failed|loading chunk/i.test(
      message,
    )
  ) {
    return JAVASCRIPT_SUBTYPE.chunk_load;
  }
  if (name === 'AbortError' || /\baborted\b/i.test(message)) {
    return JAVASCRIPT_SUBTYPE.user_abort;
  }
  if (
    (name === 'TypeError' || name === 'ReferenceError') &&
    /failed to fetch|network error|load failed|fetch/i.test(message)
  ) {
    return JAVASCRIPT_SUBTYPE.network;
  }
  return JAVASCRIPT_SUBTYPE.generic;
};

/**
 * @description Short heading for JavaScript errors in the boundary (subtype-aware).
 */
export const javascriptErrorBoundaryTitle = (
  subtype: JavascriptErrorSubtype,
): string => {
  switch (subtype) {
    case 'chunk_load':
      return 'Stale build or missing chunk';
    case 'user_abort':
      return 'Request aborted';
    case 'network':
      return 'Network error';
    case 'generic':
      return 'Application error';
  }
};

/**
 * @description One-line explanation for support / users (subtype-aware).
 */
export const javascriptErrorBoundaryHint = (
  subtype: JavascriptErrorSubtype,
): string => {
  switch (subtype) {
    case 'chunk_load':
      return 'Assets may be out of date after a deployment—try a hard refresh or clear cache.';
    case 'user_abort':
      return 'A navigation or request was cancelled before it finished.';
    case 'network':
      return 'The browser could not complete a network request; check connectivity and VPN.';
    case 'generic':
      return 'Something went wrong while rendering this screen.';
  }
};

/**
 * @description Groups HTTP route errors for copy payloads and Rollbar (when reported).
 */
export type HttpRouteErrorBucket = 'redirect' | 'client' | 'server';

/**
 * @description Classifies a route error response for labeling and telemetry.
 */
export const bucketRouteHttpStatus = (status: number): HttpRouteErrorBucket => {
  if (status >= 300 && status < 400) {
    return 'redirect';
  }
  if (status >= 500) {
    return 'server';
  }
  return 'client';
};

/**
 * @description User-visible summary for HTTP route errors (uses status when helpful).
 */
export const routeHttpErrorSummary = (status: number): string => {
  const bucket = bucketRouteHttpStatus(status);
  if (bucket === 'server') {
    return 'Server error';
  }
  if (status === 404) {
    return 'Not found';
  }
  if (status === 401 || status === 403) {
    return 'Unauthorized or forbidden';
  }
  if (bucket === 'redirect') {
    return 'HTTP redirect';
  }
  if (status >= 400) {
    return 'Client or routing error';
  }
  return 'HTTP / route error';
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
const ROLLBAR_TOKEN_PLACEHOLDER_FRAGMENTS = [
  'changeme',
  'placeholder',
  'replace_me',
  'rollbar-test-token',
  'test-token',
  'your-token',
  'your_rollbar',
] as const;

/**
 * @description True when the token looks like a real Rollbar post_client_item token, not a dummy env value.
 */
export const isUsableRollbarClientToken = (
  token: string | undefined,
): token is string => {
  if (token == null || token.length < 8) {
    return false;
  }
  const trimmed = token.trim();
  if (trimmed.length < 8) {
    return false;
  }
  // Single repeated character (common .env placeholders: xxxxx…)
  if (/^(.)\1+$/.test(trimmed)) {
    return false;
  }
  const lower = trimmed.toLowerCase();
  for (const fragment of ROLLBAR_TOKEN_PLACEHOLDER_FRAGMENTS) {
    if (lower.includes(fragment)) {
      return false;
    }
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
 * Uses {@link window.env} from the root loader only so production builds cannot be overridden by bundler mode in tests.
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
