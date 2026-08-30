import * as React from 'react';
import clsx from 'clsx';
import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';

export interface ProjectsStatsProps {
  className?: string;
  plansLinkedCount?: number | null;
  tasksLinkedCount?: number | null;
  totalProjects: number;
}

export const ProjectsStats = (
  props: ProjectsStatsProps,
): React.ReactElement => {
  const { className, plansLinkedCount, tasksLinkedCount, totalProjects } =
    props;

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
      data-testid="ProjectsStats"
    >
      <OpenThrottleStatCard title="Total projects" value={totalProjects} />
      {plansLinkedCount != null && (
        <OpenThrottleStatCard title="Plans linked" value={plansLinkedCount} />
      )}
      {tasksLinkedCount != null && (
        <OpenThrottleStatCard title="Tasks linked" value={tasksLinkedCount} />
      )}
    </div>
  );
};
