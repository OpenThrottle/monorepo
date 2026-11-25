import { cn } from '@openthrottle/react-router-shadcn';
import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';
import * as React from 'react';

import { RULES_COPY } from '../data/copy';

export interface RulesStatsProps {
  className?: string;
  disabledCount: number;
  enabledCount: number;
  globalCount: number;
  projectCount: number;
  repositoryCount: number;
  totalCount: number;
}

export const RulesStats = (props: RulesStatsProps): React.ReactElement => {
  const {
    className,
    disabledCount,
    enabledCount,
    globalCount,
    projectCount,
    repositoryCount,
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
      className={cn('grid gap-4 md:grid-cols-6 md:gap-6 lg:gap-8', className)}
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
      <OpenThrottleStatCard
        title={RULES_COPY.statsGlobalLabel}
        value={globalCount}
      />
      <OpenThrottleStatCard
        title={RULES_COPY.statsRepositoryLabel}
        value={repositoryCount}
      />
      <OpenThrottleStatCard
        title={RULES_COPY.statsProjectLabel}
        value={projectCount}
      />
    </div>
  );
};
