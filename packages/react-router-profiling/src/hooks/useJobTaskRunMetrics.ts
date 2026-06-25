/**
 * @description Fetches task-run metrics for a plans-queue job via GraphQL job(jobId, queueName: "plans").
 */

import * as React from 'react';
import { getMetricsApiBaseUrl } from '../config/metrics-api';
import { fetchJobTaskRunMetrics } from '../data/fetch-job-task-run-metrics';
import type { JobWithTaskRunMetrics } from '../data/metrics-types';

export interface UseJobTaskRunMetricsResult {
  readonly error: Error | null;
  readonly job: JobWithTaskRunMetrics | null;
  readonly loading: boolean;
}

export interface UseJobTaskRunMetricsOptions {
  /** API base URL for openthrottle-server. Defaults to getMetricsApiBaseUrl(). */
  readonly apiBaseUrl?: string;
}

/**
 * @description Fetches job with taskRunMetrics when jobId is non-null. Single fetch (no polling). Pass apiBaseUrl or set via setMetricsApiBaseUrl().
 */
export function useJobTaskRunMetrics(
  jobId: string | null,
  options: UseJobTaskRunMetricsOptions = {},
): UseJobTaskRunMetricsResult {
  const apiBaseUrl = options.apiBaseUrl ?? getMetricsApiBaseUrl();

  const [job, setJob] = React.useState<JobWithTaskRunMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (jobId == null || jobId === '') {
      setJob(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const result = await fetchJobTaskRunMetrics(
          apiBaseUrl,
          jobId,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setJob(result);
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [apiBaseUrl, jobId]);

  return { error, job, loading };
}
