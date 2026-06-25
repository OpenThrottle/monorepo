/**
 * @description Fetches current process metrics from openthrottle-server GET /metrics.
 */

import type { ProcessMetricsSnapshot } from './metrics-types';
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  buildRequestSignal,
} from './request-timeout';

/** Numeric fields that must all be present and finite on a valid snapshot. */
const REQUIRED_NUMERIC_KEYS: ReadonlyArray<keyof ProcessMetricsSnapshot> = [
  'cpuSystemMs',
  'cpuUserMs',
  'externalMb',
  'heapTotalMb',
  'heapUsedMb',
  'rssMb',
];

/** Type guard asserting every required numeric field is present and finite. */
function isProcessMetricsSnapshot(
  value: unknown,
): value is ProcessMetricsSnapshot {
  if (value == null || typeof value !== 'object') {
    return false;
  }
  const record: Record<string, unknown> = { ...value };
  return REQUIRED_NUMERIC_KEYS.every((key) => Number.isFinite(record[key]));
}

/**
 * @description Fetches server process metrics (RSS, heap, external, CPU) from GET /metrics. Use apiBaseUrl from getMetricsApiBaseUrl() or pass from host app. Pass an AbortSignal to cancel the in-flight request (e.g. on unmount); the request is also bounded by `timeoutMs` (default {@link DEFAULT_REQUEST_TIMEOUT_MS}, pass 0 to disable) so a hung server cannot leave the request pending forever.
 */
export async function fetchServerMetrics(
  apiBaseUrl: string,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<ProcessMetricsSnapshot> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/metrics`;
  const res = await fetch(url, {
    signal: buildRequestSignal(signal, timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`Metrics fetch failed ${res.status}: ${res.statusText}`);
  }

  const data: unknown = await res.json();
  if (!isProcessMetricsSnapshot(data)) {
    throw new Error('Invalid metrics response shape');
  }

  return data;
}
