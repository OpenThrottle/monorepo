/**
 * @description Helpers for the browser-facing API base (`API_URL_EXTERNAL`).
 *
 * The value is either absolute (`http://localhost:6021`, a second origin) or a
 * path on the page's own origin (`/api`, routed by the Vite dev proxy locally
 * and by Caddy when deployed). The relative form is what lets one config work
 * on every host the app is served from — localhost, a tailnet name, or the
 * deployed domain — so anything that needs a full URL resolves it against the
 * origin it is actually being served from.
 */

/**
 * @description True when the API base is a path on the page's own origin
 * (`/api`) rather than an absolute URL. Protocol-relative values (`//host`)
 * name another host, so they are not relative here.
 * @public
 */
export const isRelativeApiUrl = (apiUrl: string): boolean =>
  apiUrl.startsWith('/') && !apiUrl.startsWith('//');

/**
 * @description Resolve the API base against an origin (or any absolute URL on
 * it): absolute values pass through, `/api` becomes `<origin>/api`. Trailing
 * slashes are stripped so callers can append `/graphql`. Returns `undefined`
 * when either value cannot be parsed.
 * @public
 */
export const resolveApiUrl = (
  apiUrl: string,
  base: string,
): string | undefined => {
  try {
    const url = new URL(apiUrl, base);

    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return undefined;
  }
};

/**
 * @description The graphql-ws endpoint for an API base: `http(s)` becomes
 * `ws(s)` and `/graphql` is appended. A relative base resolves against
 * `base` first, so `/api` on an https page yields `wss://<host>/api/graphql`.
 * Returns `undefined` when the base cannot be resolved.
 * @public
 */
export const toGraphqlWsUrl = (
  apiUrl: string,
  base: string,
): string | undefined => {
  const resolved = resolveApiUrl(apiUrl, base);

  return resolved ? `${resolved.replace(/^http/, 'ws')}/graphql` : undefined;
};

/**
 * @description The origin a request was made to, as the browser saw it. Behind
 * a TLS-terminating proxy (Caddy, `tailscale serve`) the app receives plain
 * http, so `X-Forwarded-Proto` / `X-Forwarded-Host` win when present. Only the
 * response to this one request is shaped by the result, so a forged header
 * changes nothing for anyone but its sender.
 * @public
 */
export const getRequestOrigin = (request: Request): string => {
  const url = new URL(request.url);
  const forwardedProto = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim();
  const forwardedHost = request.headers
    .get('x-forwarded-host')
    ?.split(',')[0]
    ?.trim();
  const protocol =
    forwardedProto === 'http' || forwardedProto === 'https'
      ? `${forwardedProto}:`
      : url.protocol;

  return `${protocol}//${forwardedHost || url.host}`;
};
