import * as React from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../utils/cn';

export interface SpinnerProps extends React.ComponentProps<'svg'> {}

/**
 * @description Renders a loading indicator for use in buttons, badges, empty states, etc.
 */
export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  (props, ref) => {
    const { className, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <LoaderCircle
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
