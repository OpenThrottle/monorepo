import * as React from 'react';
import { ChevronRightIcon } from 'lucide-react';

import { cn } from '../../utils/cn';
import { PaginationLink } from './PaginationLink';

export interface PaginationNextProps extends React.ComponentProps<
  typeof PaginationLink
> {}

export const PaginationNext = React.forwardRef<
  React.ComponentRef<typeof PaginationLink>,
  PaginationNextProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <PaginationLink
      aria-label="Go to next page"
      className={cn('gap-1 px-2.5 sm:pr-2.5', className)}
      ref={ref}
      size="default"
      {...rest}
    >
      <span className="hidden sm:block">Next</span>
      <ChevronRightIcon />
    </PaginationLink>
  );
});

PaginationNext.displayName = 'PaginationNext';
