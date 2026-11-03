import {
  Card,
  CardContent,
  CardHeader,
  cn,
  Skeleton,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import {
  PLAN_RUN_TRANSPARENCY_SKELETON_HISTORY_COLUMNS,
  PLAN_RUN_TRANSPARENCY_SKELETON_HISTORY_ROWS,
} from '~/routing/plans/data/data.plan-run-transparency-skeleton';

export interface PlanRunTransparencySkeletonProps {
  readonly className?: string;
}

/**
 * @description Pending stand-in for the Details tab's "Runs" card, drawn in the populated card's
 * normal-case shape — title and description, one Upcoming block, a Latest run block, a run history
 * table (header plus five rows) and the collapsed CLI & debug row — so the tab does not jump when
 * run history resolves.
 */
export const PlanRunTransparencySkeleton = (
  props: PlanRunTransparencySkeletonProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const sectionHeading = <Skeleton className="h-3 w-20" />;

  const historyRow = (rowKey: string, cellClassName: string) => (
    <div className="flex items-center gap-4 px-2 py-3" key={rowKey}>
      <Skeleton className="size-4 shrink-0" />
      {PLAN_RUN_TRANSPARENCY_SKELETON_HISTORY_COLUMNS.map((column) => (
        <Skeleton
          className={cn(
            cellClassName,
            column.widthClassName,
            column.hiddenOnNarrow && 'hidden sm:block',
          )}
          key={column.key}
        />
      ))}
      <Skeleton className="ml-auto size-4 shrink-0" />
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      aria-busy="true"
      className={cn('mt-8', className)}
      data-testid="PlanRunTransparencySkeleton"
    >
      <CardHeader className="gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-full max-w-md" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-8">
          <div
            className="flex flex-col gap-3"
            data-testid="PlanRunTransparencySkeleton-upcoming"
          >
            {sectionHeading}
            <div className="border-primary/30 bg-primary/5 flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-3 w-72 max-w-full" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </div>

          <div
            className="flex flex-col gap-3"
            data-testid="PlanRunTransparencySkeleton-latest"
          >
            {sectionHeading}
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
          </div>

          <div
            className="flex flex-col gap-3"
            data-testid="PlanRunTransparencySkeleton-history"
          >
            {sectionHeading}
            <div className="divide-border divide-y">
              {historyRow('header', 'h-3')}
              {PLAN_RUN_TRANSPARENCY_SKELETON_HISTORY_ROWS.map((row) =>
                historyRow(String(row), 'h-4'),
              )}
            </div>
          </div>

          <div
            className="border-border border-t pt-3"
            data-testid="PlanRunTransparencySkeleton-cli"
          >
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
