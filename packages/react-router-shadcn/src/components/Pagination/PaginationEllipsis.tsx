import * as React from 'react';
import { MoreHorizontalIcon } from 'lucide-react';

import { cn } from '../../utils/cn';

export interface PaginationEllipsisProps extends React.ComponentProps<'span'> {}

export const PaginationEllipsis = React.forwardRef<
  HTMLSpanElement,
  PaginationEllipsisProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <span
      aria-hidden={true}
      className={cn('flex size-9 items-center justify-center', className)}
      data-slot="pagination-ellipsis"
      ref={ref}
      {...rest}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
});

PaginationEllipsis.displayName = 'PaginationEllipsis';
