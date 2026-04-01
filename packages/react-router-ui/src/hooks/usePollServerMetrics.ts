import * as React from 'react';
import { fetchServerMetrics } from './fetchServerMetrics';

export interface UsePollServerMetricsOptions {
  readonly intervalMs: number;
  readonly query: string;
  readonly token?: string;
  readonly url: string;
}

export interface UsePollServerMetricsResult<T> {
  readonly error: Error | null;
  readonly loading: boolean;
  readonly serverMetrics: T | null;
}

/**
 * @description Polls server metrics from openthrottle-server. Stub implementation; wire to GraphQL when needed.
 */
export function usePollServerMetrics<T>(
  options: UsePollServerMetricsOptions,
): UsePollServerMetricsResult<T> {
  const { intervalMs = 60_000 } = options;

  // Hooks
  const [error, setError] = React.useState<Error | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [serverMetrics, setServerMetrics] = React.useState<T | null>(null);

  // Setup

  // Handlers
  const fetchMetrics = React.useCallback(async (): Promise<void> => {
    try {
      const data = await fetchServerMetrics<T>(
        options.url,
        options.query,
        options.token,
      );

      // FIXME: Tighten this up
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      setServerMetrics((data as unknown as { serverMetrics: T }).serverMetrics);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  }, []);

  // Markup

  // Life Cycle

  React.useEffect(() => {
    void fetchMetrics();

    if (intervalMs <= 0) return;

    const id = setInterval(() => {
      void fetchMetrics();
    }, intervalMs);

    return () => clearInterval(id);

    // 🪝 Fetch metrics as our interval elapses
  }, [fetchMetrics, intervalMs]);

  // 🔌 Short Circuit

  return { error, loading, serverMetrics };
}
