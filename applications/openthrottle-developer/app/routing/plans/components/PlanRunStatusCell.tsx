import { Badge } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { parseDate } from '~/global/utils/dates';
import { PlanRunStatusBadge } from '~/routing/plans/components/PlanRunStatusBadge';
import { PLAN_RUN_STATUS_CELL_COPY } from '~/routing/plans/data/data.copy';

export interface PlanRunStatusCellProps {
  /** Present on a continuation run: the usage-limited run it picks up from. */
  readonly resumeOfRunId: string | null;
  /** True when a later run in the list continues this (usage-limited) run. */
  readonly resumeScheduled: boolean;
  /** ISO instant a SCHEDULED run fires; null on every other kind of run. */
  readonly scheduledFor?: string | null;
  /** Raw `plan_runs.status` (QUEUED, IN_PROGRESS, COMPLETED, ..., USAGE_LIMITED, SCHEDULED, MISSED, SUPERSEDED). */
  readonly status: string;
  /** ISO instant the usage limit lifts; null when the CLI reported none. */
  readonly usageLimitResetsAt: string | null;
}

/**
 * @description Status cell for the queued-run audit table. Most statuses render as plain text.
 * `USAGE_LIMITED` gets a badge plus the reset time in the viewer's local time and whether the run
 * resumes by itself; `SCHEDULED` a badge plus when it fires (local time); `MISSED` and `SUPERSEDED`
 * a badge plus why the run never started. A continuation run is badged "Resumed".
 */
export const PlanRunStatusCell = (
  props: PlanRunStatusCellProps,
): React.ReactElement => {
  const {
    resumeOfRunId,
    resumeScheduled,
    scheduledFor = null,
    status,
    usageLimitResetsAt,
  } = props;

  // Hooks

  // Setup
  const {
    firesPrefix,
    firesUnknown,
    missedReason,
    notResumedSuffix,
    resetUnknown,
    resetsPrefix,
    resumedBadge,
    resumedHint,
    resumesPrefix,
    supersededReason,
  } = PLAN_RUN_STATUS_CELL_COPY;
  const isUsageLimited = status === 'USAGE_LIMITED';
  const isScheduled = status === 'SCHEDULED';
  const isMissed = status === 'MISSED';
  const isSuperseded = status === 'SUPERSEDED';
  const isSkippedOrPending = isScheduled || isMissed || isSuperseded;
  const isContinuationRun = resumeOfRunId !== null;
  const resetsAt = parseDate(usageLimitResetsAt);
  const hasResetTime = resetsAt !== null;
  const resetPrefix = resumeScheduled ? resumesPrefix : resetsPrefix;
  const firesAt = parseDate(scheduledFor);
  const hasFireTime = firesAt !== null;

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
  const knownFireTime = (
    <span>
      {firesPrefix}{' '}
      <time dateTime={firesAt?.toISOString()}>{firesAt?.toLocaleString()}</time>
    </span>
  );
  const unknownFireTime = <span>{firesUnknown}</span>;
  const fireTimeNote = hasFireTime ? knownFireTime : unknownFireTime;
  const reasonNote = <span>{isMissed ? missedReason : supersededReason}</span>;

  // Life Cycle

  // 🔌 Short Circuit
  if (isSkippedOrPending) {
    return (
      <span className="flex flex-col gap-1" data-testid="PlanRunStatusCell">
        <PlanRunStatusBadge status={status} />
        {isScheduled ? fireTimeNote : reasonNote}
      </span>
    );
  }

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
      <PlanRunStatusBadge status={status} />
      {hasResetTime ? knownResetTime : unknownResetTime}
      {resumeScheduled ? null : notResumedNote}
    </span>
  );
};
