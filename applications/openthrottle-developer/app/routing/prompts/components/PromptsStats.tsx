import { cn } from '@openthrottle/react-router-shadcn';
import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';
import * as React from 'react';

import { PROMPTS_STATS_COPY } from '~/routing/prompts/data/copy';

export interface PromptsStatsProps {
  className?: string;
  readonly countPersonas: number;
  readonly countPrompts: number;
  readonly countSkills: number;
  readonly total: number;
}

/**
 * @description Per-type counts for the prompts list, computed by the route
 * loader from the rows the current search and type filters return.
 */
export const PromptsStats = (props: PromptsStatsProps): React.ReactElement => {
  const { className, countPersonas, countPrompts, countSkills, total } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn(
        'grid gap-4 sm:grid-cols-2 md:gap-8 lg:grid-cols-4 lg:gap-12',
        className,
      )}
      data-testid="PromptsStats"
    >
      <OpenThrottleStatCard
        color="bg-blue-300"
        title={PROMPTS_STATS_COPY.prompts}
        value={countPrompts}
      />
      <OpenThrottleStatCard
        color="bg-green-300"
        title={PROMPTS_STATS_COPY.skills}
        value={countSkills}
      />
      <OpenThrottleStatCard
        color="bg-yellow-300"
        title={PROMPTS_STATS_COPY.personas}
        value={countPersonas}
      />
      <OpenThrottleStatCard title={PROMPTS_STATS_COPY.total} value={total} />
    </div>
  );
};
