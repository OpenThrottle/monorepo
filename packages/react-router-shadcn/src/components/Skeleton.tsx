import * as React from 'react';
import { cn } from '../utils/cn';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('bg-accent animate-pulse rounded-md', className)}
      data-slot="skeleton"
      {...props}
    />
  );
}

export { Skeleton };
