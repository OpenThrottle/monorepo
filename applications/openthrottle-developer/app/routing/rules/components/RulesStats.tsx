import * as React from 'react';
import clsx from 'clsx';
import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';
import { RULES_COPY } from '../data/data.copy';

export interface RulesStatsProps {
  className?: string;
  disabledCount: number;
  enabledCount: number;
  totalCount: number;
}

export const RulesStats = (props: RulesStatsProps): React.ReactElement => {
  const { className, disabledCount, enabledCount, totalCount } = props;

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
      data-testid="RulesStats"
    >
      <OpenThrottleStatCard
        title={RULES_COPY.statsTotalLabel}
        value={totalCount}
      />
      <OpenThrottleStatCard
        title={RULES_COPY.statsEnabledLabel}
        value={enabledCount}
      />
      <OpenThrottleStatCard
        title={RULES_COPY.statsDisabledLabel}
        value={disabledCount}
      />
    </div>
  );
};
