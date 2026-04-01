import * as React from 'react';
import classnames from 'classnames';
import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';

export interface ProjectsStatsCardsProps {
  className?: string;
  plansLinkedCount?: number | null;
  totalProjects: number;
}

export const ProjectsStatsCards = (props: ProjectsStatsCardsProps) => {
  const { className, plansLinkedCount, totalProjects } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('grid md:grid-cols-3 gap-4 lg:gap-8', className)}
      data-testid="ProjectsStatsCards"
    >
      <OpenThrottleStatCard title="Total projects" value={totalProjects} />
      {plansLinkedCount != null && (
        <OpenThrottleStatCard title="Plans linked" value={plansLinkedCount} />
      )}
    </div>
  );
};
