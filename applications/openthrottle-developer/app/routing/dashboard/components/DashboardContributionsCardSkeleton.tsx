import * as React from 'react';
import clsx from 'clsx';
import { Card, Skeleton } from '@openthrottle/react-router-shadcn';

export interface DashboardContributionsCardSkeletonProps {
  className?: string;
}

/**
 * @description Placeholder matching DashboardContributionsCard's footprint
 * (header row + heatmap grid), streamed into the real card via `<Await>`. The
 * `min-h-[140px]` block mirrors the heatmap height so streamed content does not
 * shift the grid.
 */
export const DashboardContributionsCardSkeleton = (
  props: DashboardContributionsCardSkeletonProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      aria-busy={true}
      className={clsx('gap-3 p-4', className)}
      data-testid="DashboardContributionsCardSkeleton"
    >
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-28" />
      </div>
      <Skeleton className="min-h-[140px] w-full" />
    </Card>
  );
};
