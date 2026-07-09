import * as React from 'react';
import clsx from 'clsx';
import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';

export interface PromptsStatsProps {
  className?: string;
  countAgents: number;
  countSkills: number;
  total: number;
}

export const PromptsStats = (props: PromptsStatsProps): React.ReactElement => {
  const { className, countAgents, countSkills, total } = props;

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
      data-testid="PromptsStats"
    >
      <OpenThrottleStatCard title="Agents-type prompts" value={countAgents} />
      <OpenThrottleStatCard title="Skills-type prompts" value={countSkills} />
      <OpenThrottleStatCard title="Total (this list)" value={total} />
    </div>
  );
};
