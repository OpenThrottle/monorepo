import * as React from 'react';
import { Skeleton } from '@openthrottle/react-router-shadcn';

export interface PlanToolbarTagsSkeletonProps {
  className?: string;
}

/**
 * @description Pending stand-in for the toolbar's tag-chip row. Deliberately
 * small: the rest of the toolbar (title, status, Run/Queue) renders from
 * critical data and must not be behind this boundary.
 */
export const PlanToolbarTagsSkeleton = (
  props: PlanToolbarTagsSkeletonProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup
  const chips = [0, 1, 2];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      aria-busy="true"
      className={className}
      data-testid="PlanToolbarTagsSkeleton"
    >
      <div className="flex items-center gap-1.5">
        {chips.map((chip) => (
          <Skeleton className="h-5 w-16 rounded-full" key={chip} />
        ))}
      </div>
    </div>
  );
};
