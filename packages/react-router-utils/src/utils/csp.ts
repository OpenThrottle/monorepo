import * as React from 'react';

/**
 * @description Content-Security-Policy helpers for nonce-based CSP shipped via
 * response headers (never a `<meta>` tag). A fresh nonce is minted per request
 * in each app's `entry.server.tsx`, threaded through {@link NonceContext} to
 * the inline `<script>` tags in `root.tsx`, and used by {@link buildCsp} to
 * assemble the policy.
 *
 * Fleet-wide policy decisions (plan bd397d4e, task dc0833be):
 * - `script-src` is `'self'` + per-request `'nonce-...'` + `'strict-dynamic'`;
 *   never `'unsafe-inline'`, never host wildcards.
 * - `connect-src` is enumerated from the app's API URL (the API origin plus
 *   its `ws(s)://` equivalent for graphql-ws); no scheme-wide grants. When no
 *   API URL is configured the policy degrades to `connect-src 'self'`.
 * - `style-src 'self' 'unsafe-inline'` is a PERMANENT fleet-wide exception:
 *   Radix and the React runtime inject inline styles, and inline styles are
 *   not a script-injection vector.
 * - `img-src` / `font-src` keep scheme-wide `https:` (+ `data:` / `blob:`) as
 *   a documented, accepted looseness.
 * - Report-Only is FORCED outside `NODE_ENV=production`; enforcement is a
 *   production-only concept, flipped per app via its `reportOnly` config.
 */

const CSP_REPORT_GROUP = 'csp-endpoint';
const CSP_REPORT_PATH = '/csp-reports';

/**
 * @description Options for {@link buildCsp}, supplied by each app's
 * `app/global/config/csp.ts`. Extension arrays exist so future origins
 * (Rollbar, analytics, ...) land as one-line config changes, not builder edits.
 * @public
 */
export interface BuildCspOptions {
  /** Extra `connect-src` sources appended after the API-derived origins. */
  additionalConnectSrc?: readonly string[];
  /** Extra `font-src` sources appended after the defaults. */
  additionalFontSrc?: readonly string[];
  /** Extra `img-src` sources appended after the defaults. */
  additionalImgSrc?: readonly string[];
  /** Extra `script-src` sources appended after the nonce + strict-dynamic. */
  additionalScriptSrc?: readonly string[];
  /**
   * The API URL the browser talks to (e.g. `API_URL_EXTERNAL`). Drives the
   * enumerated `connect-src` (origin + `ws(s)://` equivalent) and the
   * `report-uri` / `report-to` targets. When absent or unparseable the policy
   * degrades gracefully: `connect-src 'self'` and no report directives.
   */
  apiUrl?: string;
  /**
   * Emit `Content-Security-Policy-Report-Only` instead of the enforcing
   * header. Ignored (forced `true`) outside `NODE_ENV=production`.
   */
  reportOnly: boolean;
}

/**
 * @description The headers {@link buildCsp} asks the caller to set: the policy
 * itself plus, when reporting is configured, the `Reporting-Endpoints` header
 * that `report-to` resolves against.
 * @public
 */
export interface BuildCspResult {
  headerName: 'Content-Security-Policy' | 'Content-Security-Policy-Report-Only';
  /**
   * Value for the `Reporting-Endpoints` response header (Reports API /
   * Chromium `report-to` delivery). Absent when no `apiUrl` is configured.
   */
  reportingEndpoints?: string;
  value: string;
}

interface ApiOrigins {
  httpOrigin?: string;
  wsOrigin?: string;
}

/**
 * @description Derives the enumerated `connect-src` origins from the API URL:
 * the API origin itself plus its websocket equivalent (`http:` → `ws:`,
 * `https:` → `wss:`) for graphql-ws subscriptions. An absent or unparseable
 * URL yields no origins so the caller degrades to `'self'`.
 */
const deriveApiOrigins = (apiUrl: string | undefined): ApiOrigins => {
  if (!apiUrl) return {};

  try {
    const url = new URL(apiUrl);
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

    return {
      httpOrigin: url.origin,
      wsOrigin: `${wsProtocol}//${url.host}`,
    };
  } catch {
    return {};
  }
};

/**
 * @description Build the CSP header for a single request. Returns the header
 * name (report-only vs enforcing — report-only is FORCED outside
 * `NODE_ENV=production`), the policy value, and, when an API URL is
 * configured, the matching `Reporting-Endpoints` header value pointing at the
 * server's `/csp-reports` endpoint.
 * @public
 */
export const buildCsp = (
  nonce: string,
  options: BuildCspOptions,
): BuildCspResult => {
  const isProduction = process.env.NODE_ENV === 'production';
  const reportOnly = isProduction ? options.reportOnly : true;

  const { httpOrigin, wsOrigin } = deriveApiOrigins(options.apiUrl);

  const connectSrc = [
    `'self'`,
    ...(httpOrigin ? [httpOrigin] : []),
    ...(wsOrigin ? [wsOrigin] : []),
    ...(options.additionalConnectSrc ?? []),
  ];
  const fontSrc = [
    `'self'`,
    'https:',
    'data:',
    ...(options.additionalFontSrc ?? []),
  ];
  const imgSrc = [
    `'self'`,
    'https:',
    'data:',
    'blob:',
    ...(options.additionalImgSrc ?? []),
  ];
  const scriptSrc = [
    `'self'`,
    `'nonce-${nonce}'`,
    `'strict-dynamic'`,
    ...(options.additionalScriptSrc ?? []),
  ];

  const directives = [
    `base-uri 'self'`,
    `child-src 'none'`,
    `connect-src ${connectSrc.join(' ')}`,
    `default-src 'self'`,
    `font-src ${fontSrc.join(' ')}`,
    `frame-ancestors 'none'`,
    `img-src ${imgSrc.join(' ')}`,
    `object-src 'none'`,
    `script-src ${scriptSrc.join(' ')}`,
    `style-src 'self' 'unsafe-inline'`,
    `worker-src 'self' blob:`,
  ];

  let reportingEndpoints: string | undefined;

  if (httpOrigin) {
    const reportUrl = `${httpOrigin}${CSP_REPORT_PATH}`;
    directives.push(`report-to ${CSP_REPORT_GROUP}`);
    directives.push(`report-uri ${reportUrl}`);
    reportingEndpoints = `${CSP_REPORT_GROUP}="${reportUrl}"`;
  }

  return {
    headerName: reportOnly
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy',
    reportingEndpoints,
    value: directives.join('; '),
  };
};

/**
 * @description Generate a fresh, cryptographically-random nonce for a single
 * request. Base64 of 16 random bytes; safe for both the CSP header and the
 * `nonce` attribute on inline scripts.
 * @public
 */
export const generateCspNonce = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

/**
 * @description Carries the per-request CSP nonce from the server render tree
 * down to the inline `<script>` tags in each app's `root.tsx`. Empty string on
 * the client (no inline scripts are emitted during hydration), so consumers
 * should treat a falsy value as "no nonce attribute".
 * @public
 */
export const NonceContext = React.createContext<string>('');

/**
 * @description Read the current request's CSP nonce. Returns an empty string
 * when no nonce is in scope (client hydration), in which case no `nonce`
 * attribute should be rendered.
 * @public
 */
export const useNonce = (): string => React.useContext(NonceContext);
