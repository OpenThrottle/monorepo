import { Badge } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { ScheduledJobCardFragment } from '~/__generated__/graphql';
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import { describeScheduleCadence } from '~/routing/schedule/utils/describe-schedule-cadence';

export interface ScheduleDetailSummaryProps {
  job: Pick<
    ScheduledJobCardFragment,
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
      </div>
      <p className="text-muted-foreground text-sm">
        {SCHEDULE_COPY.repositoryColumnLabel}:{' '}
        {job.repository?.displayName ?? SCHEDULE_COPY.repositoryNoneOption}
      </p>
    </div>
  );
};
