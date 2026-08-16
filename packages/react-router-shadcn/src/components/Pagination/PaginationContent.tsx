import * as React from 'react';

import { cn } from '../../utils/cn';

export interface PaginationContentProps extends React.ComponentProps<'ul'> {}

export const PaginationContent = React.forwardRef<
  HTMLUListElement,
  PaginationContentProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ul
      className={cn('flex flex-row items-center gap-2', className)}
      data-slot="pagination-content"
      ref={ref}
      {...rest}
    />
  );
});

PaginationContent.displayName = 'PaginationContent';
