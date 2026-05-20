/**
 * @description Polls server metrics (GET /metrics) on a configurable interval. Uses config or optional apiBaseUrl.
 */

import * as React from 'react';
import { getMetricsApiBaseUrl } from '../config/metrics-api';
import { fetchServerMetrics } from '../data/fetch-server-metrics';
import type { ProcessMetricsSnapshot } from '../data/metrics-types';

const DEFAULT_INTERVAL_MS = 60_000;

export interface UseServerMetricsResult {
  readonly error: Error | null;
  readonly loading: boolean;
  /** Refetch metrics on demand (e.g. when polling is disabled). */
  readonly refetch: () => Promise<void>;
  readonly serverMetrics: ProcessMetricsSnapshot | null;
}

export interface UseServerMetricsOptions {
  /** API base URL for openthrottle-server. Defaults to getMetricsApiBaseUrl(). */
  readonly apiBaseUrl?: string;
  /** Poll interval in ms. Default 60_000. Use 0 to disable polling (single fetch). */
  readonly intervalMs?: number;
}

/**
 * @description Fetches server metrics after mount and refetches on a configurable interval. Pass apiBaseUrl or set via setMetricsApiBaseUrl().
 */
export function useServerMetrics(
  options: UseServerMetricsOptions = {},
): UseServerMetricsResult {
  const {
    apiBaseUrl = getMetricsApiBaseUrl(),
    intervalMs = DEFAULT_INTERVAL_MS,
  } = options;

  const [serverMetrics, setServerMetrics] =
    React.useState<ProcessMetricsSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchMetrics = React.useCallback(async (): Promise<void> => {
    try {
      const data = await fetchServerMetrics(apiBaseUrl);
      setServerMetrics(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  const refetch = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    await fetchMetrics();
  }, [fetchMetrics]);

  React.useEffect(() => {
    void fetchMetrics();

    if (intervalMs <= 0) {
      return;
    }

    const id = setInterval(() => {
      void fetchMetrics();
    }, intervalMs);

    return () => clearInterval(id);
  }, [fetchMetrics, intervalMs]);

  return { error, loading, refetch, serverMetrics };
}
