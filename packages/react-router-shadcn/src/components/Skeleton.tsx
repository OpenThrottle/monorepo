import * as React from 'react';
import { cn } from '../utils/cn';

type BaseProps = React.HTMLAttributes<HTMLDivElement>;

export interface SkeletonProps extends BaseProps {
  // tbd...
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (props, ref) => {
    const { className, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <div
        className={cn('animate-pulse rounded-md bg-muted', className)}
        ref={ref}
        {...rest}
      />
    );
  },
);

Skeleton.displayName = 'Skeleton';
