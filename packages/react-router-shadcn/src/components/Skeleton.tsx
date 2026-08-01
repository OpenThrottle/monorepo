import * as React from 'react';
import { cn } from '../utils/cn';

export interface SkeletonProps extends React.ComponentProps<'div'> {}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (props, ref): React.ReactElement => {
    const { className, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <div
        className={cn('bg-accent animate-pulse rounded-md', className)}
        data-slot="skeleton"
        ref={ref}
        {...rest}
      />
    );
  },
);

Skeleton.displayName = 'Skeleton';
