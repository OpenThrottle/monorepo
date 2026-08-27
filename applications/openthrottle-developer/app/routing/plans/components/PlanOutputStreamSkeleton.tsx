import * as React from 'react';
import { Skeleton } from '@openthrottle/react-router-shadcn';

export interface PlanOutputStreamSkeletonProps {
  className?: string;
}

/**
 * @description Pending stand-in for {@link OutputStream}: a day label followed by
 * a left-ruled list of time-column + content rows, matching the real stream's
 * `grid-cols-[auto_1fr]` layout so nothing shifts when the chunks land.
 */
export const PlanOutputStreamSkeleton = (
  props: PlanOutputStreamSkeletonProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup
  const rows = [0, 1, 2, 3, 4, 5];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      aria-busy="true"
      className={className}
      data-testid="PlanOutputStreamSkeleton"
    >
      <Skeleton className="mb-8 h-4 w-32" />

      <ol className="border-border/60 mt-1 space-y-1.5 border-l pl-3">
        {rows.map((row) => (
          <li
            className="grid grid-cols-[auto_1fr] items-baseline gap-x-3"
            key={row}
          >
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-full" />
          </li>
        ))}
      </ol>
    </div>
  );
};
