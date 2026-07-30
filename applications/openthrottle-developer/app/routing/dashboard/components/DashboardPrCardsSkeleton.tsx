import * as React from 'react';
import clsx from 'clsx';
import { Skeleton } from '@openthrottle/react-router-shadcn';

export interface DashboardPrCardsSkeletonProps {
  className?: string;
}

/**
 * @description Placeholder for a single GitHub-stats PR card body (PR time in
 * state / PRs by author). Rendered as the `<Await>` fallback in each PR-card
 * grid cell while the deferred `githubStats` promise resolves; the headings
 * stay synchronous, so this only fills the card body's `min-h-[240px]` chart
 * footprint to avoid layout shift.
 */
export const DashboardPrCardsSkeleton = (
  props: DashboardPrCardsSkeletonProps,
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
      data-testid="DashboardPrCardsSkeleton"
    >
      <Skeleton className="min-h-[240px] w-full" />
    </div>
  );
};
