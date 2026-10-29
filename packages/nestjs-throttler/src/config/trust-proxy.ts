/**
 * @description Express `trust proxy` for apps that rate-limit by client IP.
 *
 * The throttler keys on `req.ip`. Behind a reverse proxy (Caddy in production,
 * the Vite dev proxy or an SSR hop locally) the TCP peer is the proxy, so
 * without `trust proxy` every request looks like one IP and one client can
 * exhaust everyone's budget. With it, Express reads `X-Forwarded-For` — but
 * only through peers it trusts, so a client cannot spoof its IP by sending the
 * header directly.
 *
 * The default trusts private-network peers only: loopback, link-local and
 * the RFC 1918 / ULA ranges a Docker network or local proxy lives on. A public
 * client is never trusted, so its forged `X-Forwarded-For` is ignored and
 * `req.ip` is its real address.
 */

/**
 * The default `trust proxy` value: private-network peers only.
 * @public
 */
export const DEFAULT_TRUST_PROXY = 'loopback, linklocal, uniquelocal';

const DISABLED_VALUES = new Set(['0', 'false', 'off']);

/**
 * @description Resolve the `TRUST_PROXY` env value into an Express
 * `trust proxy` setting. Unset or blank → {@link DEFAULT_TRUST_PROXY};
 * `false`/`off`/`0` → `false` (trust nothing, `req.ip` is the TCP peer); a
 * positive integer → that many hops; anything else is passed through as an
 * Express subnet / preset list (e.g. `10.0.0.0/8, loopback`).
 * @public
 */
export const resolveTrustProxy = (
  value: string | undefined,
): boolean | number | string => {
  const trimmed = value?.trim() ?? '';

  if (trimmed === '') {
    return DEFAULT_TRUST_PROXY;
  }

  if (DISABLED_VALUES.has(trimmed.toLowerCase())) {
    return false;
  }

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  return trimmed;
};
