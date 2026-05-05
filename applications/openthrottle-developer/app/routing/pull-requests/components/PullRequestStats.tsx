import * as React from 'react';
import classnames from 'classnames';
import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';

export interface PullRequestStatsProps {
  readonly className?: string;
}

export const PullRequestStats = (props: PullRequestStatsProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('grid md:grid-cols-3 gap-4 lg:gap-8', className)}
      data-testid="PullRequestStats"
    >
      <OpenThrottleStatCard subValue={21} title="Open / Yours" value={23} />
      <OpenThrottleStatCard subValue={85} title="Merged / Closed" value={100} />
      <OpenThrottleStatCard title="All" value={123} />
    </div>
  );
};
