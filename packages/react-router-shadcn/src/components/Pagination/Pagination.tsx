import * as React from 'react';

import { cn } from '../../utils/cn';

export interface PaginationProps extends React.ComponentProps<'nav'> {}

export const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  (props, ref): React.ReactElement => {
    const { className, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <nav
        aria-label="pagination"
        className={cn('mx-auto flex w-full justify-center', className)}
        data-slot="pagination"
        ref={ref}
        role="navigation"
        {...rest}
      />
    );
  },
);

Pagination.displayName = 'Pagination';
