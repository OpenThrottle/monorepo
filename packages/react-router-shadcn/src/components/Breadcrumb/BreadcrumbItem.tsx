import * as React from 'react';
import { cn } from '../../utils/cn';

export interface BreadcrumbItemProps extends React.ComponentPropsWithoutRef<'li'> {}

export const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  BreadcrumbItemProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <li
      className={cn('inline-flex items-center gap-1.5', className)}
      ref={ref}
      {...rest}
    />
  );
});

BreadcrumbItem.displayName = 'BreadcrumbItem';
