import { Badge } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { parseDate } from '~/global/utils/dates';
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
  const {
    notResumedSuffix,
    resetUnknown,
    resetsPrefix,
    resumedBadge,
    resumedHint,
    resumesPrefix,
    usageLimitedBadge,
  } = PLAN_RUN_STATUS_CELL_COPY;
  const isUsageLimited = status === 'USAGE_LIMITED';
  const isContinuationRun = resumeOfRunId !== null;
  const resetsAt = parseDate(usageLimitResetsAt);
  const hasResetTime = resetsAt !== null;
  const resetPrefix = resumeScheduled ? resumesPrefix : resetsPrefix;

  // Handlers

  // Markup
  const continuationBadge = (
    <Badge color="blue" size="xs" title={resumedHint}>
      {resumedBadge}
    </Badge>
  );
  const knownResetTime = (
    <span>
      {resetPrefix}{' '}
      <time dateTime={resetsAt?.toISOString()}>
        {resetsAt?.toLocaleString()}
      </time>
    </span>
  );
  const unknownResetTime = <span>{resetUnknown}</span>;
  const notResumedNote = <span>{notResumedSuffix}</span>;

  // Life Cycle

  // 🔌 Short Circuit
  if (!isUsageLimited) {
    return (
      <span className="flex flex-col gap-1" data-testid="PlanRunStatusCell">
        <span>{status}</span>
        {isContinuationRun ? continuationBadge : null}
      </span>
    );
  }

  return (
    <span className="flex flex-col gap-1" data-testid="PlanRunStatusCell">
      <Badge color="amber" size="xs">
        {usageLimitedBadge}
      </Badge>
      {hasResetTime ? knownResetTime : unknownResetTime}
      {resumeScheduled ? null : notResumedNote}
    </span>
  );
};
