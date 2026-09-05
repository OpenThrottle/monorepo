import * as React from 'react';

import { cn } from '../../utils/cn';
import type { Button } from '../Button';
import { buttonVariants } from '../Button';

export type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
  React.ComponentProps<'a'>;

export const PaginationLink = React.forwardRef<
  HTMLAnchorElement,
  PaginationLinkProps
>((props, ref): React.ReactElement => {
  const { className, isActive, size = 'icon', ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        buttonVariants({
          size,
          variant: isActive ? 'outline' : 'ghost',
        }),
        className,
      )}
      data-active={isActive}
      data-slot="pagination-link"
      ref={ref}
      {...rest}
    />
  );
});

PaginationLink.displayName = 'PaginationLink';
