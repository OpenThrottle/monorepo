'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '../utils/cn';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, max = 100, ...props }, ref) => (
  <ProgressPrimitive.Root
    className={cn(
      'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
      className,
    )}
    max={max}
    ref={ref}
    value={value}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full bg-primary transition-all"
      style={{
        width: `${((value ?? 0) / (max ?? 100)) * 100}%`,
      }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
