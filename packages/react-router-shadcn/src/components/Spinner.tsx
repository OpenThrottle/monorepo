import * as React from 'react';
import { Loader2Icon } from 'lucide-react';
import { cn } from '../utils/cn';

export interface SpinnerProps extends React.ComponentProps<'svg'> {}

export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  (props, ref): React.ReactElement => {
    const { className, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <Loader2Icon
        aria-label="Loading"
        className={cn('size-4 animate-spin', className)}
        ref={ref}
        role="status"
        {...rest}
      />
    );
  },
);

Spinner.displayName = 'Spinner';
