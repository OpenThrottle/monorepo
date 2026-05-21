import * as React from 'react';
import { Progress as ProgressPrimitive } from 'radix-ui';
import { cn } from '../utils/cn';

type BaseProps = React.ComponentProps<typeof ProgressPrimitive.Root>;

export interface ProgressProps extends BaseProps {
  readonly value?: number;
}

export const Progress = (props: ProgressProps): React.ReactElement => {
  const { className, value, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ProgressPrimitive.Root
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
        className,
      )}
      data-slot="progress"
      {...rest}
      value={value}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-primary transition-all"
        data-slot="progress-indicator"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
};
