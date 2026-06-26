import * as React from 'react';

/**
 * @description Content-Security-Policy helpers for nonce-based CSP shipped via
 * response headers (never a `<meta>` tag). A fresh nonce is minted per request
 * in `entry.server.tsx`, threaded through {@link NonceContext} to the inline
 * `<script>` tags in `root.tsx`, and used to build the policy below.
 *
 * The policy drops `'unsafe-inline'` and the `https://*` / `http://*` wildcard
 * from `script-src` in favour of `'nonce-...'` + `'strict-dynamic'`. It is
 * emitted as `Content-Security-Policy-Report-Only` first so violations are
 * surfaced without breaking the app; flip {@link CSP_HEADER_NAME} to the
 * enforcing header once the report stream is clean.
 */

/**
 * Report-only while we observe violations in production. Switch to
 * `'Content-Security-Policy'` to enforce once the report stream is clean.
 */
export const CSP_HEADER_NAME = 'Content-Security-Policy-Report-Only' as const;

/**
 * Generate a fresh, cryptographically-random nonce for a single request.
 * Base64 of 16 random bytes; safe for both the CSP header and the `nonce`
 * attribute on inline scripts.
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
 * Build the CSP directive string for a given request nonce.
 *
 * - `script-src` uses `'nonce-<nonce>'` + `'strict-dynamic'` so the inline
 *   bootstrap scripts and the scripts they load are trusted without
 *   `'unsafe-inline'` or host wildcards.
 * - `style-src` retains `'unsafe-inline'` because styles are injected inline
 *   by the styling layer and are not a script-injection vector.
 * - `connect-src` / `img-src` allow `https:` so the app can reach its API and
 *   load remote imagery (bucket assets, analytics) without enumerating hosts.
 */
export const buildCspValue = (nonce: string): string => {
  const isProduction = process.env.NODE_ENV === 'production';
  const remoteScheme = isProduction ? 'https:' : 'http: https:';

  return [
    `default-src 'self'`,
    `base-uri 'self'`,
    `child-src 'none'`,
    `connect-src 'self' ${remoteScheme} wss: ws:`,
    `font-src 'self' https: data:`,
    `frame-ancestors 'none'`,
    `img-src 'self' ${remoteScheme} data: blob:`,
    `object-src 'none'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `worker-src 'self' blob:`,
  ].join('; ');
};

/**
 * Carries the per-request CSP nonce from the server render tree down to the
 * inline `<script>` tags in `root.tsx`. Empty string on the client (no inline
 * scripts are emitted during hydration), so consumers should treat a falsy
 * value as "no nonce attribute".
 */
export const NonceContext = React.createContext<string>('');

/**
 * Read the current request's CSP nonce. Returns an empty string when no nonce
 * is in scope (client hydration), in which case no `nonce` attribute should be
 * rendered.
 */
export const useNonce = (): string => React.useContext(NonceContext);
