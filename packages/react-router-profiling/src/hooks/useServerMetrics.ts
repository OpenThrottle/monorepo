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

  // Guards every setState against firing after unmount (a slow in-flight
  // request or a polling interval that resolves mid-teardown).
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchMetrics = React.useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      try {
        const data = await fetchServerMetrics(apiBaseUrl, signal);
        if (!mountedRef.current) {
          return;
        }
        setServerMetrics(data);
        setError(null);
      } catch (e) {
        if (signal?.aborted || !mountedRef.current) {
          return;
        }
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (mountedRef.current && !signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [apiBaseUrl],
  );

  const refetch = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    await fetchMetrics();
  }, [fetchMetrics]);

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchMetrics(controller.signal);

    if (intervalMs <= 0) {
      return () => controller.abort();
    }

    const id = setInterval(() => {
      void fetchMetrics(controller.signal);
    }, intervalMs);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [fetchMetrics, intervalMs]);

  return { error, loading, refetch, serverMetrics };
}
