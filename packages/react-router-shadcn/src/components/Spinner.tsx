import * as React from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../utils/cn';

interface SpinnerProps extends React.ComponentProps<'svg'> {}

/**
 * @description Renders a loading indicator for use in buttons, badges, empty states, etc.
 */
export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, ...props }, ref) => (
    <LoaderCircle
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      ref={ref}
      role="status"
      {...props}
    />
  ),
);
Spinner.displayName = 'Spinner';
