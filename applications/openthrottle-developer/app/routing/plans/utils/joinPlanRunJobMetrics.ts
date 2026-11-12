import type { PlanDetailRunHistoryQuery } from '~/__generated__/graphql';

/** One completed BullMQ job's metrics, as `metrics.recentPlanRunsMetrics` returns it. */
export type PlanRunMetricsEntry =
  PlanDetailRunHistoryQuery['metrics']['recentPlanRunsMetrics'][number];

/** The completed-job metrics a Run history row shows in its expanded detail. */
export interface PlanRunJobMetrics {
  /** ISO timestamp of BullMQ `finishedOn`; null when absent or not a finite epoch. */
  readonly finishedOn: string | null;
  readonly rssEndMb: number | null;
}

interface PlanRunJobRow {
  readonly bullmqJobId?: string | null;
  readonly id: string;
}

const toFinishedOnIso = (
  finishedOn: number | null | undefined,
): string | null => {
  if (finishedOn == null || !Number.isFinite(finishedOn)) {
    return null;
  }

  return new Date(finishedOn).toISOString();
};

/**
 * @description Joins completed-job metrics onto runs by `row.bullmqJobId === entry.jobId`, keyed
 * by run id. Runs with no job (CLI/orchestrator runs) or no matching entry are absent from the
 * map; entries matching no run are dropped.
 */
export const joinPlanRunJobMetrics = (
  rows: readonly PlanRunJobRow[],
  metrics: readonly PlanRunMetricsEntry[],
): ReadonlyMap<string, PlanRunJobMetrics> => {
  const byJobId = new Map(metrics.map((entry) => [entry.jobId, entry]));
  const joined = new Map<string, PlanRunJobMetrics>();

  for (const row of rows) {
    const entry =
      row.bullmqJobId == null ? undefined : byJobId.get(row.bullmqJobId);
    if (entry !== undefined) {
      joined.set(row.id, {
        finishedOn: toFinishedOnIso(entry.finishedOn),
        rssEndMb: entry.taskRunMetrics?.atEnd.rssMb ?? null,
      });
    }
  }

  return joined;
};
