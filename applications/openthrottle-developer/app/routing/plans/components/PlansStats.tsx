import * as React from 'react';
import classnames from 'classnames';
import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';

export interface PlansStatsProps {
  className?: string;
  countInProgress: number;
  countCompleted: number;
  totalCount: number;
  totalCountAll: number;
  totalCountQueued: number;
}

export const PlansStats = (props: PlansStatsProps) => {
  const {
    className,
    countInProgress,
    countCompleted,
    totalCount,
    totalCountAll,
    totalCountQueued,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames(
        'grid md:grid-cols-3 gap-4 md:gap-8 lg:gap-12',
        className,
      )}
    >
      <OpenThrottleStatCard
        color="bg-yellow-300"
        subValue={totalCountQueued}
        title="In progress / Queued"
        value={countInProgress}
      />
      <OpenThrottleStatCard
        color="bg-green-300"
        subValue={totalCountAll}
        title="Matching / Total plans"
        value={totalCount}
      />
      <OpenThrottleStatCard
        color="bg-green-300"
        title="Completed (all)"
        value={countCompleted}
      />
    </div>
  );
};
