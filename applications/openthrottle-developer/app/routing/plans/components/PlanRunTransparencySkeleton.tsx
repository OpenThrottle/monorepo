import * as React from 'react';
import { Skeleton } from '@openthrottle/react-router-shadcn';

export interface PlanRunTransparencySkeletonProps {
  className?: string;
}

/**
 * @description Pending stand-in for the Details tab's run-transparency block:
 * a heading plus two tables (recent runs, run audit), each a header row over
 * several body rows, so the tab keeps its height while run history streams in.
 */
export const PlanRunTransparencySkeleton = (
  props: PlanRunTransparencySkeletonProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup
  const tables = [0, 1];
  const rows = [0, 1, 2];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      aria-busy="true"
      className={className}
      data-testid="PlanRunTransparencySkeleton"
    >
      {tables.map((table) => (
        <div className="mb-6 space-y-2" key={table}>
          <Skeleton className="h-4 w-40" />

          <div className="border-border/60 divide-border/60 divide-y rounded-md border">
            <div className="flex gap-4 p-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>

            {rows.map((row) => (
              <div className="flex gap-4 p-2" key={row}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
