import * as React from 'react';
import { cn } from '../../utils/cn';

export interface BreadcrumbPageProps extends React.ComponentPropsWithoutRef<'span'> {}

export const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  BreadcrumbPageProps
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
      aria-current="page"
      className={cn('text-foreground font-normal', className)}
      ref={ref}
      role="link"
      {...rest}
    />
  );
});

BreadcrumbPage.displayName = 'BreadcrumbPage';
