/**
 * @description Fetches job with taskRunMetrics from openthrottle-server GraphQL job(jobId, queueName: "plans").
 */

import type {
  JobWithTaskRunMetrics,
  ProcessMetricsSnapshot,
} from './metrics-types';

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

interface GraphqlResponse<T> {
  readonly data?: T;
  readonly errors?: ReadonlyArray<{ readonly message: string }>;
}

interface JobTaskRunMetricsData {
  readonly job?: {
    readonly id: string;
    readonly taskRunMetrics?: {
      readonly atStart: ProcessMetricsSnapshot;
      readonly atEnd: ProcessMetricsSnapshot;
    } | null;
  } | null;
}

/**
 * @description Fetches a plans-queue job with taskRunMetrics (atStart, atEnd). Use for displaying per-run CPU/memory deltas. Use apiBaseUrl from getMetricsApiBaseUrl() or pass from host app.
 */
export async function fetchJobTaskRunMetrics(
  apiBaseUrl: string,
  jobId: string,
): Promise<JobWithTaskRunMetrics | null> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/graphql`;
  const res = await fetch(url, {
    body: JSON.stringify({
      query: JOB_TASK_RUN_METRICS_QUERY,
      variables: { jobId, queueName: 'plans' },
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  // FIXME: Tighten this up
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const json = (await res.json()) as GraphqlResponse<JobTaskRunMetricsData>;
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
