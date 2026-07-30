import * as React from 'react';
import clsx from 'clsx';
import { Skeleton } from '@openthrottle/react-router-shadcn';

export interface HomeComposerSkeletonProps {
  className?: string;
}

/**
 * @description Disabled composer placeholder shown while the deferred composer
 * data (discovered models / personas / repositories) streams in. Mirrors the
 * `ChatComposer` footprint — a textarea frame plus a toolbar row — so the real
 * composer swaps in without layout shift.
 */
export const HomeComposerSkeleton = (
  props: HomeComposerSkeletonProps,
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
      className={clsx('flex shrink-0 flex-col gap-4 pt-4', className)}
      data-testid="HomeComposerSkeleton"
    >
      {/* Textarea frame */}
      <Skeleton className="h-24 w-full rounded-lg" />

      {/* Toolbar row: control pills on the left, send affordance on the right */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      <p className="text-muted-foreground text-center text-xs">
        Discovering models…
      </p>
    </div>
  );
};
