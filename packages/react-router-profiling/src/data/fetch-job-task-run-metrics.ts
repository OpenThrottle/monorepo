/**
 * @description Fetches job with taskRunMetrics from openthrottle-server GraphQL job(jobId, queueName: "plans").
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import type {
  JobWithTaskRunMetrics,
  ProcessMetricsSnapshot,
} from './metrics-types';
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  buildRequestSignal,
} from './request-timeout';

const PROCESS_METRICS_FIELDS = `
  rssMb heapUsedMb heapTotalMb externalMb cpuUserMs cpuSystemMs
`;

const JOB_TASK_RUN_METRICS_QUERY = `
  query getJobTaskRunMetrics($jobId: ID!, $queueName: String!) {
    job(jobId: $jobId, queueName: $queueName) {
      id
      taskRunMetrics {
        atStart { ${PROCESS_METRICS_FIELDS} }
        atEnd { ${PROCESS_METRICS_FIELDS} }
      }
    }
  }
`;

interface GraphqlError {
  readonly message: string;
}

interface JobTaskRunMetricsData {
  readonly job?: {
    readonly id: string;
    readonly taskRunMetrics?: {
      readonly atEnd: ProcessMetricsSnapshot;
      readonly atStart: ProcessMetricsSnapshot;
    } | null;
  } | null;
}

interface GraphqlResponse {
  readonly data?: JobTaskRunMetricsData;
  readonly errors?: ReadonlyArray<GraphqlError>;
}

/**
 * @description Narrows untrusted JSON to the GraphQL envelope we expect. We only
 * validate the structural envelope (data?/errors[].message) here, not the deep
 * job shape — downstream reads are optional-chained and tolerate a missing job.
 */
function isGraphqlResponse(value: unknown): value is GraphqlResponse {
  if (!isRecord(value)) {
    return false;
  }

  if ('errors' in value && value.errors !== undefined) {
    if (!Array.isArray(value.errors)) {
      return false;
    }

    if (
      !value.errors.every(
        (entry) => isRecord(entry) && typeof entry.message === 'string',
      )
    ) {
      return false;
    }
  }

  return true;
}

/**
 * @description Parses a fetch Response body as JSON, tolerating a non-JSON body
 * (e.g. a 5xx HTML error page or an empty body) by returning null instead of
 * throwing a raw SyntaxError. Reads the body as text first so a parse failure
 * cannot escape as an unhandled error.
 */
async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (text === '') {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * @description Fetches a plans-queue job with taskRunMetrics (atStart, atEnd). Use for displaying per-run CPU/memory deltas. Use apiBaseUrl from getMetricsApiBaseUrl() or pass from host app. Pass an AbortSignal to cancel the in-flight request (e.g. on unmount); the request is also bounded by `timeoutMs` (default {@link DEFAULT_REQUEST_TIMEOUT_MS}, pass 0 to disable) so a hung server cannot leave the request pending forever.
 */
export async function fetchJobTaskRunMetrics(
  apiBaseUrl: string,
  jobId: string,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<JobWithTaskRunMetrics | null> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/graphql`;
  const res = await fetch(url, {
    body: JSON.stringify({
      query: JOB_TASK_RUN_METRICS_QUERY,
      variables: { jobId, queueName: 'plans' },
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal: buildRequestSignal(signal, timeoutMs),
  });

  const parsed = await parseJsonSafe(res);
  const json: GraphqlResponse = isGraphqlResponse(parsed) ? parsed : {};

  if (!res.ok) {
    const message = json.errors?.[0]?.message ?? res.statusText;
    throw new Error(`GraphQL error ${res.status}: ${message}`);
  }

  if (json.errors != null && json.errors.length > 0) {
    throw new Error(`GraphQL errors: ${json.errors[0]?.message ?? 'unknown'}`);
  }

  const job = json.data?.job ?? null;
  if (job == null) {
    return null;
  }

  return {
    id: job.id,
    taskRunMetrics: job.taskRunMetrics ?? null,
  };
}
