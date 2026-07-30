import * as React from 'react';
import clsx from 'clsx';
import { Skeleton } from '@openthrottle/react-router-shadcn';

export interface DashboardActivityChartSkeletonProps {
  className?: string;
}

/**
 * @description Placeholder matching a col-span-2 chart card footprint (the
 * "This Week's Activity" bar chart and the recent-activity feed). Streamed into
 * the real card via `<Await>`; the `min-h-[240px]` block mirrors the chart's
 * `ChartContainer` height so streamed content does not shift the grid.
 */
export const DashboardActivityChartSkeleton = (
  props: DashboardActivityChartSkeletonProps,
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
      aria-busy={true}
      className={clsx('mt-4 w-full', className)}
      data-testid="DashboardActivityChartSkeleton"
    >
      <Skeleton className="min-h-[240px] w-full" />
    </div>
  );
};
