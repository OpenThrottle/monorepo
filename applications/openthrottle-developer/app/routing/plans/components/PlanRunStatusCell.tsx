import { Badge } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { PLAN_RUN_STATUS_CELL_COPY } from '~/routing/plans/data/data.copy';

export interface PlanRunStatusCellProps {
  /** Present on a continuation run: the usage-limited run it picks up from. */
  readonly resumeOfRunId: string | null;
  /** True when a later run in the list continues this (usage-limited) run. */
  readonly resumeScheduled: boolean;
  /** Raw `plan_runs.status` (QUEUED, IN_PROGRESS, COMPLETED, ..., USAGE_LIMITED). */
  readonly status: string;
  /** ISO instant the usage limit lifts; null when the CLI reported none. */
  readonly usageLimitResetsAt: string | null;
}

/**
 * @description Status cell for the queued-run audit table. Every status renders as plain text
 * except `USAGE_LIMITED`, which gets a distinct "Usage limited" badge plus the reset time in the
 * viewer's local time and whether the run resumes by itself, and a continuation run, which is
 * badged "Resumed".
 */
export const PlanRunStatusCell = (
  props: PlanRunStatusCellProps,
): React.ReactElement => {
  const { resumeOfRunId, resumeScheduled, status, usageLimitResetsAt } = props;

  // Hooks

  // Setup
  const resetsAtDate =
    usageLimitResetsAt === null ? null : new Date(usageLimitResetsAt);
  const hasValidResetTime =
    resetsAtDate !== null && !Number.isNaN(resetsAtDate.getTime());

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (status !== 'USAGE_LIMITED') {
    return (
      <span className="flex flex-col gap-1" data-testid="PlanRunStatusCell">
        <span>{status}</span>
        {resumeOfRunId !== null ? (
          <Badge
            color="blue"
            size="xs"
            title={PLAN_RUN_STATUS_CELL_COPY.resumedHint}
          >
            {PLAN_RUN_STATUS_CELL_COPY.resumedBadge}
          </Badge>
        ) : null}
      </span>
    );
  }

  return (
    <span className="flex flex-col gap-1" data-testid="PlanRunStatusCell">
      <Badge color="amber" size="xs">
        {PLAN_RUN_STATUS_CELL_COPY.usageLimitedBadge}
      </Badge>
      {hasValidResetTime && usageLimitResetsAt !== null ? (
        <span>
          {resumeScheduled
            ? PLAN_RUN_STATUS_CELL_COPY.resumesPrefix
            : PLAN_RUN_STATUS_CELL_COPY.resetsPrefix}{' '}
          <time dateTime={usageLimitResetsAt}>
            {resetsAtDate.toLocaleString()}
          </time>
        </span>
      ) : (
        <span>{PLAN_RUN_STATUS_CELL_COPY.resetUnknown}</span>
      )}
      {resumeScheduled ? null : (
        <span>{PLAN_RUN_STATUS_CELL_COPY.notResumedSuffix}</span>
      )}
    </span>
  );
};
