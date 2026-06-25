/**
 * @description Config for openthrottle-server API base URL used by metrics fetchers and hooks.
 * Host app can set via setMetricsApiBaseUrl() or pass apiBaseUrl into hooks/fetchers.
 * Falls back to OPENTHROTTLE_API_URL, then API_URL, then default for dev.
 *
 * PREFERRED USAGE: pass `apiBaseUrl` explicitly into the hooks/fetchers (e.g.
 * resolved in a loader and threaded down). The module-level singleton and the
 * `process.env` fallback below are a dev/legacy convenience, not the intended
 * path for production or SSR/multi-tenant hosts.
 *
 * VITE-DEFINE REQUIREMENT: this lib is browser-bundled, so there is no Node
 * `process` at runtime. The `process.env.OPENTHROTTLE_API_URL` /
 * `process.env.API_URL` reads below only work because a bundler statically
 * replaces those exact member expressions at build time. Consuming apps that
 * rely on the env fallback MUST define them (Vite `define`), e.g.:
 *
 *   // vite.config.ts
 *   define: {
 *     'process.env.OPENTHROTTLE_API_URL': JSON.stringify(env.OPENTHROTTLE_API_URL ?? ''),
 *   }
 *
 * Without that define the `typeof process !== 'undefined'` guard short-circuits
 * and getMetricsApiBaseUrl() silently falls back to DEFAULT_API_BASE_URL.
 *
 * SSR/MULTI-TENANT CAVEAT: setMetricsApiBaseUrl() mutates a module-level
 * singleton shared across all requests in a server process. Do not use it to
 * carry per-request/per-tenant URLs on the server — pass `apiBaseUrl` per call
 * instead.
 */

const DEFAULT_API_BASE_URL = 'http://localhost:6010';

let metricsApiBaseUrl: string | null = null;

/**
 * @description Returns the API base URL for metrics (GET /metrics and GraphQL).
 * Resolution order: explicitly set URL (setMetricsApiBaseUrl), then the
 * build-time-replaced env OPENTHROTTLE_API_URL or API_URL (see VITE-DEFINE
 * REQUIREMENT above), then DEFAULT_API_BASE_URL. Prefer passing `apiBaseUrl`
 * directly to hooks/fetchers over relying on this global.
 */
export function getMetricsApiBaseUrl(): string {
  if (metricsApiBaseUrl != null && metricsApiBaseUrl !== '') {
    return metricsApiBaseUrl;
  }

  if (typeof process !== 'undefined' && process.env != null) {
    const fromEnv =
      process.env.OPENTHROTTLE_API_URL ?? process.env.API_URL ?? '';

    if (fromEnv !== '') {
      return fromEnv.replace(/\/$/, '');
    }
  }

  return DEFAULT_API_BASE_URL;
}

/**
 * @description Sets the API base URL for metrics. Call from the host app (e.g. openthrottle-developer) so the library uses the same API URL.
 */
export function setMetricsApiBaseUrl(url: string): void {
  metricsApiBaseUrl = url == null ? null : url.replace(/\/$/, '');
}
