import { Badge } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { ScheduledJobCardFragment } from '~/__generated__/graphql';
import { ScheduleAllowedCommands } from '~/routing/schedule/components/ScheduleAllowedCommands';
import { ScheduleJobMarkers } from '~/routing/schedule/components/ScheduleJobMarkers';
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import { describeScheduleCadence } from '~/routing/schedule/utils/describeScheduleCadence';

export interface ScheduleDetailSummaryProps {
  job: Pick<
    ScheduledJobCardFragment,
    | 'allowedCommands'
    | 'approvalState'
    | 'createdVia'
    | 'cronPattern'
    | 'driverId'
    | 'intervalMs'
    | 'model'
    | 'repository'
    | 'runAt'
    | 'scheduleKind'
    | 'timezone'
  >;
}

/**
 * @description One-line summary under a schedule's heading: what runs it, on what cadence, and which
 * repository it targets.
 */
export const ScheduleDetailSummary = (
  props: ScheduleDetailSummaryProps,
): React.ReactElement => {
  const { job } = props;

  // Hooks

  // Setup
  // A pending job shows its list in the approval notice instead, next to Approve.
  const showsAllowedCommands = job.approvalState !== 'pending';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex flex-col gap-2" data-testid="ScheduleDetailSummary">
      <div className="flex items-center gap-4">
        <Badge>
          {job.driverId} {job.model ? ` · ${job.model}` : ''}
        </Badge>
        <p className="text-muted-foreground text-sm">
          {describeScheduleCadence(job)}
        </p>
        <ScheduleJobMarkers job={job} />
      </div>
      <p className="text-muted-foreground text-sm">
        {SCHEDULE_COPY.repositoryColumnLabel}:{' '}
        {job.repository?.displayName ?? SCHEDULE_COPY.repositoryNoneOption}
      </p>
      {showsAllowedCommands && <ScheduleAllowedCommands job={job} />}
    </div>
  );
};
