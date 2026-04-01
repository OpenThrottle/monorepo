/**
 * @description Config for openthrottle-server API base URL used by metrics fetchers and hooks.
 * Host app can set via setMetricsApiBaseUrl() or pass apiBaseUrl into hooks/fetchers.
 * Falls back to OPENTHROTTLE_API_URL, then API_URL, then default for dev.
 */

const DEFAULT_API_BASE_URL = 'http://localhost:6010';

let metricsApiBaseUrl: string | null = null;

/**
 * @description Returns the API base URL for metrics (GET /metrics and GraphQL). Uses explicitly set URL, then env OPENTHROTTLE_API_URL or API_URL, then default.
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
