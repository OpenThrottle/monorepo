import { RUN_DETAIL_COPY } from '~/routing/schedule/data/data.run-detail';
import { formatWhen } from '~/routing/schedule/utils/formatWhen';

/** The usage-limit fields of a scheduled run — a structural subset of the run fragments. */
export interface RunUsageLimit {
  readonly resumeOfRunId?: string | null;
  readonly status: string;
  readonly usageLimitResetsAt?: string | null;
}

/** A labeled line of the run-detail field grid. */
export interface RunUsageLimitRow {
  readonly label: string;
  readonly mono: boolean;
  readonly value: string;
}

/**
 * @description The run-detail lines a usage limit adds: when the limit resets (a `usage_limited`
 * run) and which run this one continues (a `resume` run). Empty for every other run.
 */
export const runUsageLimitRows = (
  run: RunUsageLimit,
): readonly RunUsageLimitRow[] => {
  const { fields } = RUN_DETAIL_COPY;
  const rows: RunUsageLimitRow[] = [];

  if (run.status === 'usage_limited') {
    rows.push({
      label: fields.usageLimitResetsAt,
      mono: false,
      value: formatWhen(run.usageLimitResetsAt),
    });
  }

  if (typeof run.resumeOfRunId === 'string') {
    rows.push({
      label: fields.resumeOfRunId,
      mono: true,
      value: run.resumeOfRunId,
    });
  }

  return rows;
};
