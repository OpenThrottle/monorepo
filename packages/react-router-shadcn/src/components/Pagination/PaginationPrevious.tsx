import * as React from 'react';
import { ChevronLeftIcon } from 'lucide-react';

import { cn } from '../../utils/cn';
import { PaginationLink } from './PaginationLink';

export interface PaginationPreviousProps extends React.ComponentProps<
  typeof PaginationLink
> {}

export const PaginationPrevious = React.forwardRef<
  React.ComponentRef<typeof PaginationLink>,
  PaginationPreviousProps
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
      aria-label="Go to previous page"
      className={cn('gap-1 px-2.5 sm:pl-2.5', className)}
      ref={ref}
      size="default"
      {...rest}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">Previous</span>
    </PaginationLink>
  );
});

PaginationPrevious.displayName = 'PaginationPrevious';
