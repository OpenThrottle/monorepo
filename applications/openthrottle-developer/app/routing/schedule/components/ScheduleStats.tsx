import * as React from 'react';
import clsx from 'clsx';
import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';
import { RUN_STATUS_DOT_CLASS } from '~/routing/schedule/data/data.run-status';
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';

export interface ScheduleStatsProps {
  className?: string;
  enabledCount: number;
  failedCount: number;
  queuedCount: number;
  ranCount: number;
  runningCount: number;
  succeededCount: number;
  totalCount: number;
}

export const ScheduleStats = (
  props: ScheduleStatsProps,
): React.ReactElement => {
  const {
    className,
    enabledCount,
    failedCount,
    queuedCount,
    ranCount,
    runningCount,
    succeededCount,
    totalCount,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx(
        'grid gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-8 lg:gap-12',
        className,
      )}
      data-testid="ScheduleStats"
    >
      <OpenThrottleStatCard
        color={RUN_STATUS_DOT_CLASS.running}
        subValue={queuedCount}
        title={SCHEDULE_COPY.statInFlightTitle}
        value={runningCount}
      />
      <OpenThrottleStatCard
        color={RUN_STATUS_DOT_CLASS.succeeded}
        subValue={succeededCount}
        title={SCHEDULE_COPY.statRanTodayTitle}
        value={ranCount}
      />
      <OpenThrottleStatCard
        color={RUN_STATUS_DOT_CLASS.failed}
        title={SCHEDULE_COPY.statFailedTitle}
        value={failedCount}
      />
      <OpenThrottleStatCard
        color={RUN_STATUS_DOT_CLASS.queued}
        subValue={totalCount}
        title={SCHEDULE_COPY.statEnabledTitle}
        value={enabledCount}
      />
    </div>
  );
};
