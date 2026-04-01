/**
 * @description Fetches current process metrics from openthrottle-server GET /metrics.
 */

import type { ProcessMetricsSnapshot } from './metrics-types';

/**
 * @description Fetches server process metrics (RSS, heap, external, CPU) from GET /metrics. Use apiBaseUrl from getMetricsApiBaseUrl() or pass from host app.
 */
export async function fetchServerMetrics(
  apiBaseUrl: string,
): Promise<ProcessMetricsSnapshot> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/metrics`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Metrics fetch failed ${res.status}: ${res.statusText}`);
  }

  // FIXME: Tighten this up
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const data = (await res.json()) as ProcessMetricsSnapshot;
  if (
    typeof data?.rssMb !== 'number' ||
    typeof data?.heapUsedMb !== 'number' ||
    typeof data?.cpuUserMs !== 'number'
  ) {
    throw new Error('Invalid metrics response shape');
  }
  return data;
}
