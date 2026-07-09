import * as React from 'react';
import clsx from 'clsx';
import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';

export interface PullRequestStatsProps {
  className?: string;
}

export const PullRequestStats = (
  props: PullRequestStatsProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx(
        'grid gap-4 md:grid-cols-3 md:gap-8 lg:gap-12',
        className,
      )}
      data-testid="PullRequestStats"
    >
      <OpenThrottleStatCard subValue={21} title="Open / Yours" value={23} />
      <OpenThrottleStatCard subValue={85} title="Merged / Closed" value={100} />
      <OpenThrottleStatCard title="All" value={123} />
    </div>
  );
};
