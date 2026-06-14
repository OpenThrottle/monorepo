import * as React from 'react';
import classnames from 'classnames';
import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';

export interface ProjectsStatsProps {
  className?: string;
  plansLinkedCount?: number | null;
  totalProjects: number;
}

export const ProjectsStats = (
  props: ProjectsStatsProps,
): React.ReactElement => {
  const { className, plansLinkedCount, totalProjects } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames(
        'grid gap-4 md:grid-cols-3 md:gap-8 lg:gap-12',
        className,
      )}
      data-testid="ProjectsStats"
    >
      <OpenThrottleStatCard title="Total projects" value={totalProjects} />
      {plansLinkedCount != null && (
        <OpenThrottleStatCard title="Plans linked" value={plansLinkedCount} />
      )}
      {/* TODO: Get tasks linked count from the API */}
      <OpenThrottleStatCard title="Tasks linked" value={123} />
    </div>
  );
};
