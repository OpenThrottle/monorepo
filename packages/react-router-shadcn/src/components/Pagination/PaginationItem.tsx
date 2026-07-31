import * as React from 'react';

export interface PaginationItemProps extends React.ComponentProps<'li'> {}

export const PaginationItem = React.forwardRef<
  HTMLLIElement,
  PaginationItemProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <li className={className} data-slot="pagination-item" ref={ref} {...rest} />
  );
});

PaginationItem.displayName = 'PaginationItem';
