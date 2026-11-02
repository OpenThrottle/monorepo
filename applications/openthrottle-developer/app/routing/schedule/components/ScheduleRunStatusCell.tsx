import { Badge } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { parseDate } from '~/global/utils/dates';
import { SCHEDULE_RUN_STATUS_CELL_COPY } from '~/routing/schedule/data/data.copy';
import {
  RUN_STATUS_COLOR,
  RUN_STATUS_LABEL,
  RUN_STATUS_VARIANT,
} from '~/routing/schedule/data/data.run-status';

export interface ScheduleRunStatusCellProps {
  /** Failure/limit detail shown as the badge tooltip; null when the run carries none. */
  readonly errorMessage: string | null | undefined;
  /** True when a later run in the list continues this (usage_limited) run. */
  readonly resumeScheduled: boolean;
  /** Raw `scheduled_agent_job_runs.status` (queued, running, ..., usage_limited). */
  readonly status: string;
  /** ISO instant the usage limit lifts; null when the CLI reported none. */
  readonly usageLimitResetsAt: string | null | undefined;
}

/**
 * @description Status cell of the scheduled-run history table: the status badge, plus — for
 * `usage_limited` only — the reset time in the viewer's local time and whether the run resumes by
 * itself (a continuation run exists) or is left for the next scheduled fire.
 */
export const ScheduleRunStatusCell = (
  props: ScheduleRunStatusCellProps,
): React.ReactElement => {
  const { errorMessage, resumeScheduled, status, usageLimitResetsAt } = props;

  // Hooks

  // Setup
  const { notResumedSuffix, resetUnknown, resetsPrefix, resumesPrefix } =
    SCHEDULE_RUN_STATUS_CELL_COPY;
  const isUsageLimited = status === 'usage_limited';
  const resetsAt = parseDate(usageLimitResetsAt);
  const hasResetTime = resetsAt !== null;
  const resetPrefix = resumeScheduled ? resumesPrefix : resetsPrefix;

  // Handlers

  // Markup
  const badge = (
    <Badge
      color={RUN_STATUS_COLOR[status] ?? 'default'}
      title={errorMessage ?? undefined}
      variant={RUN_STATUS_VARIANT[status] ?? 'outline'}
    >
      {RUN_STATUS_LABEL[status] ?? status}
    </Badge>
  );
  const knownResetTime = (
    <span className="text-muted-foreground text-xs">
      {resetPrefix}{' '}
      <time dateTime={resetsAt?.toISOString()}>
        {resetsAt?.toLocaleString()}
      </time>
    </span>
  );
  const unknownResetTime = (
    <span className="text-muted-foreground text-xs">{resetUnknown}</span>
  );
  const notResumedNote = (
    <span className="text-muted-foreground text-xs">{notResumedSuffix}</span>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (!isUsageLimited) {
    return (
      <div className="p-2" data-testid="ScheduleRunStatusCell">
        {badge}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-start gap-1 p-2"
      data-testid="ScheduleRunStatusCell"
    >
      {badge}
      {hasResetTime ? knownResetTime : unknownResetTime}
      {resumeScheduled ? null : notResumedNote}
    </div>
  );
};
